// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SeersLeagueV2Complete
 * @notice Complete V2 contract with all required functions
 * @dev First 5 predictions free, then 0.5 USDC per match
 * @author SeersHub
 * @dev Version 2.0.0
 */
contract SeersLeagueV2Complete is Ownable, Pausable, ReentrancyGuard {
    // ==================== CONSTANTS ====================
    
    string public constant VERSION = "2.0.0";
    uint256 public constant TOTAL_FREE_PREDICTIONS = 5;
    uint256 public constant PREDICTION_FEE = 500_000; // 0.5 USDC (6 decimals)
    uint256 public constant MIN_MATCHES_THRESHOLD = 50;
    uint256 public constant UPDATE_COOLDOWN = 24 hours;
    uint256 public constant PREDICTION_DEADLINE = 10 minutes;
    
    // ==================== STATE VARIABLES ====================
    
    IERC20 public immutable USDC;
    address public treasury;
    uint256 public totalMatches;
    uint256 public lastMatchUpdate;
    uint256 public lastLeaderboardUpdate;
    
    // ==================== STRUCTS ====================
    
    struct Match {
        uint256 id;
        uint256 startTime;
        uint256 homeScore;
        uint256 awayScore;
        bool isRecorded;
        bool exists;
        uint256 recordedAt;
    }
    
    struct Prediction {
        uint256 matchId;
        uint8 outcome; // 1: home win, 2: draw, 3: away win
        uint256 timestamp;
        bool isProcessed;
    }
    
    struct UserStats {
        uint256 totalPredictions;
        uint256 correctPredictions;
        uint256 freePredictionsUsed;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 lastPredictionTime;
        uint256 totalFeesPaid;
    }
    
    // ==================== MAPPINGS ====================
    
    mapping(uint256 => Match) public matches;
    mapping(address => mapping(uint256 => Prediction)) public predictions;
    mapping(address => UserStats) public userStats;
    mapping(address => uint256[]) public userPredictionHistory;
    
    // ==================== EVENTS ====================
    
    event TreasuryUpdated(address indexed newTreasury);
    event MatchRegistered(uint256 indexed matchId, uint256 startTime);
    event PredictionsSubmitted(
        address indexed user,
        uint256[] matchIds,
        uint256 predictionsCount,
        uint256 freeUsed,
        uint256 totalFee
    );
    event ResultRecorded(
        address indexed user,
        uint256 indexed matchId,
        bool correct
    );
    event MatchResultUpdated(
        uint256 indexed matchId,
        uint256 homeScore,
        uint256 awayScore,
        uint256 recordedAt
    );
    event AutoMatchUpdate(uint256 added, uint256 total);
    
    // ==================== CONSTRUCTOR ====================
    
    constructor(address _usdc, address _treasury) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_treasury != address(0), "Invalid treasury address");
        USDC = IERC20(_usdc);
        treasury = _treasury;
    }
    
    // ==================== PREDICTION FUNCTIONS ====================
    
    function submitPredictions(
        uint256[] calldata matchIds,
        uint8[] calldata outcomes
    ) external nonReentrant whenNotPaused {
        require(matchIds.length > 0 && matchIds.length <= 5, "1-5 predictions allowed");
        require(matchIds.length == outcomes.length, "Data mismatch");
        
        UserStats storage userStatsData = userStats[msg.sender];
        uint256 predictionsInBatch = matchIds.length;
        uint256 predictionsToPayFor = 0;
        uint256 freeUsed = 0;
        
        // Calculate free vs paid predictions
        if (userStatsData.freePredictionsUsed < TOTAL_FREE_PREDICTIONS) {
            uint256 freePredictionsAvailable = TOTAL_FREE_PREDICTIONS - userStatsData.freePredictionsUsed;
            
            if (predictionsInBatch <= freePredictionsAvailable) {
                freeUsed = predictionsInBatch;
                userStatsData.freePredictionsUsed += predictionsInBatch;
                predictionsToPayFor = 0;
            } else {
                freeUsed = freePredictionsAvailable;
                predictionsToPayFor = predictionsInBatch - freePredictionsAvailable;
                userStatsData.freePredictionsUsed = TOTAL_FREE_PREDICTIONS;
            }
        } else {
            predictionsToPayFor = predictionsInBatch;
        }
        
        // Handle payment
        uint256 totalFee = 0;
        if (predictionsToPayFor > 0) {
            totalFee = predictionsToPayFor * PREDICTION_FEE;
            require(USDC.balanceOf(msg.sender) >= totalFee, "Insufficient USDC");
            require(USDC.transferFrom(msg.sender, treasury, totalFee), "USDC transfer failed");
            userStatsData.totalFeesPaid += totalFee;
        }
        
        // Store predictions
        for (uint256 i = 0; i < predictionsInBatch; i++) {
            uint256 currentMatchId = matchIds[i];
            
            require(outcomes[i] >= 1 && outcomes[i] <= 3, "Invalid outcome");
            require(predictions[msg.sender][currentMatchId].timestamp == 0, "Match already predicted");
            
            Match storage matchData = matches[currentMatchId];
            require(matchData.exists, "Match not registered");
            require(!matchData.isRecorded, "Match already recorded");
            require(block.timestamp < matchData.startTime - PREDICTION_DEADLINE, "Prediction deadline passed");
            
            predictions[msg.sender][currentMatchId] = Prediction({
                matchId: currentMatchId,
                outcome: outcomes[i],
                timestamp: block.timestamp,
                isProcessed: false
            });
            
            userPredictionHistory[msg.sender].push(currentMatchId);
        }
        
        userStatsData.totalPredictions += predictionsInBatch;
        userStatsData.lastPredictionTime = block.timestamp;
        
        emit PredictionsSubmitted(
            msg.sender,
            matchIds,
            predictionsInBatch,
            freeUsed,
            totalFee
        );
    }
    
    // ==================== RESULT RECORDING FUNCTIONS ====================
    
    function recordMatchResults(
        uint256[] calldata matchIds,
        uint8[] calldata homeScores,
        uint8[] calldata awayScores
    ) external onlyOwner {
        require(
            matchIds.length == homeScores.length &&
            matchIds.length == awayScores.length,
            "Length mismatch"
        );
        
        for (uint256 i = 0; i < matchIds.length; i++) {
            uint256 currentMatchId = matchIds[i];
            Match storage matchData = matches[currentMatchId];
            
            require(matchData.exists, "Match not registered");
            require(!matchData.isRecorded, "Match already recorded");
            require(block.timestamp >= matchData.startTime, "Match not started yet");
            
            matchData.homeScore = homeScores[i];
            matchData.awayScore = awayScores[i];
            matchData.isRecorded = true;
            matchData.recordedAt = block.timestamp;
            
            emit MatchResultUpdated(
                currentMatchId,
                homeScores[i],
                awayScores[i],
                block.timestamp
            );
        }
    }
    
    function batchRecordResults(
        address[] calldata users,
        uint256[] calldata matchIds,
        bool[] calldata corrects
    ) external onlyOwner {
        require(
            users.length == matchIds.length &&
            matchIds.length == corrects.length,
            "Length mismatch"
        );
        
        for (uint256 i = 0; i < users.length; i++) {
            Prediction storage userPrediction = predictions[users[i]][matchIds[i]];
            if (userPrediction.timestamp > 0 && !userPrediction.isProcessed) {
                UserStats storage stats = userStats[users[i]];
                if (corrects[i]) {
                    stats.correctPredictions++;
                    stats.currentStreak++;
                    if (stats.currentStreak > stats.longestStreak) {
                        stats.longestStreak = stats.currentStreak;
                    }
                } else {
                    stats.currentStreak = 0;
                }
                userPrediction.isProcessed = true;
                emit ResultRecorded(users[i], matchIds[i], corrects[i]);
            }
        }
    }
    
    // ==================== MATCH MANAGEMENT FUNCTIONS ====================
    
    function registerMatches(
        uint256[] calldata matchIds,
        uint256[] calldata startTimes
    ) external onlyOwner {
        require(matchIds.length == startTimes.length, "Length mismatch");
        require(matchIds.length > 0, "No matches to register");
        
        for (uint256 i = 0; i < matchIds.length; i++) {
            uint256 matchId = matchIds[i];
            uint256 startTime = startTimes[i];
            
            require(!matches[matchId].exists, "Match already exists");
            require(startTime > block.timestamp, "Start time must be in future");
            
            matches[matchId] = Match({
                id: matchId,
                startTime: startTime,
                homeScore: 0,
                awayScore: 0,
                isRecorded: false,
                exists: true,
                recordedAt: 0
            });
            
            totalMatches++;
            emit MatchRegistered(matchId, startTime);
        }
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }
    
    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }
    
    function getVersion() external pure returns (string memory) {
        return VERSION;
    }
    
    function getContractInfo() external view returns (
        string memory version,
        address contractOwner,
        address contractTreasury,
        bool isPaused,
        uint256 contractTotalMatches
    ) {
        return (
            VERSION,
            owner(),
            treasury,
            paused(),
            totalMatches
        );
    }
    
    // ==================== V2 ENHANCED FUNCTIONS ====================
    
    function getMatchStatistics() external view returns (
        uint256 total,
        uint256 upcoming,
        uint256 finished,
        uint256 recorded
    ) {
        uint256 currentTime = block.timestamp;
        uint256 twoHoursAgo = currentTime - 7200;
        
        for (uint256 i = 1; i <= totalMatches; i++) {
            Match storage matchData = matches[i];
            if (matchData.exists) {
                total++;
                
                if (matchData.isRecorded) {
                    recorded++;
                } else if (matchData.startTime > currentTime) {
                    upcoming++;
                } else if (matchData.startTime < twoHoursAgo) {
                    finished++;
                }
            }
        }
    }
    
    function getUpcomingMatches(uint256 limit) external view returns (
        uint256[] memory matchIds,
        uint256[] memory startTimes
    ) {
        if (limit > 50) limit = 50;
        
        uint256[] memory tempMatchIds = new uint256[](totalMatches);
        uint256[] memory tempStartTimes = new uint256[](totalMatches);
        uint256 count = 0;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 1; i <= totalMatches; i++) {
            Match storage matchData = matches[i];
            if (matchData.exists && 
                matchData.startTime > currentTime + PREDICTION_DEADLINE && 
                !matchData.isRecorded) {
                tempMatchIds[count] = i;
                tempStartTimes[count] = matchData.startTime;
                count++;
                if (count >= limit) break;
            }
        }
        
        matchIds = new uint256[](count);
        startTimes = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            matchIds[i] = tempMatchIds[i];
            startTimes[i] = tempStartTimes[i];
        }
    }
    
    function getUserPredictionHistoryWithResults(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (
        uint256[] memory matchIds,
        uint8[] memory outcomes,
        uint256[] memory timestamps,
        uint8[] memory results,
        uint8[] memory matchResults
    ) {
        if (limit > 50) limit = 50;
        
        uint256[] memory userHistory = userPredictionHistory[user];
        uint256 totalPredictions = userHistory.length;
        
        if (offset >= totalPredictions) {
            return (new uint256[](0), new uint8[](0), new uint256[](0), new uint8[](0), new uint8[](0));
        }
        
        uint256 end = offset + limit;
        if (end > totalPredictions) end = totalPredictions;
        
        uint256 count = end - offset;
        matchIds = new uint256[](count);
        outcomes = new uint8[](count);
        timestamps = new uint256[](count);
        results = new uint8[](count);
        matchResults = new uint8[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 matchId = userHistory[offset + i];
            Prediction storage prediction = predictions[user][matchId];
            Match storage matchData = matches[matchId];
            
            matchIds[i] = matchId;
            outcomes[i] = prediction.outcome;
            timestamps[i] = prediction.timestamp;
            
            if (!matchData.exists || !matchData.isRecorded) {
                results[i] = 0;
                matchResults[i] = 0;
            } else {
                uint8 actualResult = 0;
                if (matchData.homeScore > matchData.awayScore) {
                    actualResult = 1;
                } else if (matchData.homeScore < matchData.awayScore) {
                    actualResult = 3;
                } else {
                    actualResult = 2;
                }
                
                matchResults[i] = actualResult;
                results[i] = (prediction.outcome == actualResult) ? 1 : 2;
            }
        }
    }
    
    function batchRegisterMatchesFromAPI(
        uint256[] calldata matchIds,
        uint256[] calldata startTimes
    ) external onlyOwner {
        require(matchIds.length == startTimes.length, "Length mismatch");
        require(matchIds.length > 0, "No matches to register");
        require(matchIds.length <= 20, "Too many matches at once");
        
        require(block.timestamp - lastMatchUpdate >= UPDATE_COOLDOWN, "Update cooldown active");
        
        uint256 added = 0;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 0; i < matchIds.length; i++) {
            uint256 matchId = matchIds[i];
            uint256 startTime = startTimes[i];
            
            if (!matches[matchId].exists && startTime > currentTime) {
                matches[matchId] = Match({
                    id: matchId,
                    startTime: startTime,
                    homeScore: 0,
                    awayScore: 0,
                    isRecorded: false,
                    exists: true,
                    recordedAt: 0
                });
                
                totalMatches++;
                added++;
                emit MatchRegistered(matchId, startTime);
            }
        }
        
        lastMatchUpdate = block.timestamp;
        emit AutoMatchUpdate(added, totalMatches);
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid treasury address");
        treasury = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}
