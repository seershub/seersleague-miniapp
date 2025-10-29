// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SeersLeagueV2
 * @notice Enhanced football prediction competition
 * @dev First 5 predictions free, then 0.5 USDC per match
 * @author SeersHub
 * @dev Version 2.0.0
 */
contract SeersLeagueV2 is Ownable, Pausable, ReentrancyGuard {
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
        uint256 correctPredictions;
        uint256 totalPredictions;
        uint256 freePredictionsUsed;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 lastPredictionTime;
        uint256 totalFeesPaid;
    }
    
    // ==================== MAPPINGS ====================
    
    mapping(uint256 => Match) public matches;
    mapping(address => UserStats) public userStats;
    mapping(address => mapping(uint256 => Prediction)) public predictions;
    mapping(address => uint256[]) public userPredictionHistory;
    
    // ==================== EVENTS ====================
    
    event PredictionsSubmitted(
        address indexed user,
        uint256[] matchIds,
        uint256 predictionsCount,
        uint256 freeUsed,
        uint256 feePaid
    );
    
    event MatchRegistered(uint256 indexed matchId, uint256 startTime);
    event ResultRecorded(address indexed user, uint256 indexed matchId, bool correct, uint256 timestamp);
    event MatchResultUpdated(uint256 indexed matchId, uint256 homeScore, uint256 awayScore, uint256 timestamp);
    event TreasuryUpdated(address indexed newTreasury);
    event AutoMatchUpdate(uint256 added, uint256 total);
    event LeaderboardUpdated(uint256 timestamp, uint256 totalUsers);
    
    // ==================== ERRORS ====================
    
    error InvalidMatchId();
    error InvalidOutcome();
    error MatchAlreadyPredicted();
    error MatchNotRegistered();
    error PredictionDeadlinePassed();
    error MatchAlreadyRecorded();
    error InsufficientUSDC();
    error UpdateCooldownActive();
    
    // ==================== CONSTRUCTOR ====================
    
    constructor(address _usdc, address _treasury) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_treasury != address(0), "Invalid treasury address");
        
        USDC = IERC20(_usdc);
        treasury = _treasury;
        
        emit TreasuryUpdated(_treasury);
    }
    
    // ==================== CORE FUNCTIONS ====================
    
    /**
     * @notice Submit predictions for matches
     * @param matchIds Array of match IDs
     * @param outcomes Array of predicted outcomes (1: home win, 2: draw, 3: away win)
     */
    function submitPredictions(
        uint256[] calldata matchIds,
        uint8[] calldata outcomes
    ) external nonReentrant whenNotPaused {
        if (matchIds.length == 0 || matchIds.length > 5) revert InvalidMatchId();
        if (matchIds.length != outcomes.length) revert InvalidMatchId();
        
        UserStats storage userStatsData = userStats[msg.sender];
        uint256 predictionsInBatch = matchIds.length;
        uint256 predictionsToPayFor = 0;
        uint256 freeUsed = 0;
        
        // Calculate free vs paid predictions
        if (userStatsData.freePredictionsUsed < TOTAL_FREE_PREDICTIONS) {
            uint256 freePredictionsAvailable = TOTAL_FREE_PREDICTIONS - userStatsData.freePredictionsUsed;
            
            if (predictionsInBatch <= freePredictionsAvailable) {
                // All predictions are free
                freeUsed = predictionsInBatch;
                userStatsData.freePredictionsUsed += predictionsInBatch;
                predictionsToPayFor = 0;
            } else {
                // Some free, some paid
                freeUsed = freePredictionsAvailable;
                predictionsToPayFor = predictionsInBatch - freePredictionsAvailable;
                userStatsData.freePredictionsUsed = TOTAL_FREE_PREDICTIONS;
            }
        } else {
            // No free predictions left
            predictionsToPayFor = predictionsInBatch;
        }
        
        // Handle payment
        uint256 totalFee = 0;
        if (predictionsToPayFor > 0) {
            totalFee = predictionsToPayFor * PREDICTION_FEE;
            if (USDC.balanceOf(msg.sender) < totalFee) revert InsufficientUSDC();
            if (!USDC.transferFrom(msg.sender, treasury, totalFee)) revert InsufficientUSDC();
            userStatsData.totalFeesPaid += totalFee;
        }
        
        // Store predictions with enhanced security checks
        for (uint256 i = 0; i < predictionsInBatch; i++) {
            uint256 currentMatchId = matchIds[i];
            
            if (outcomes[i] < 1 || outcomes[i] > 3) revert InvalidOutcome();
            if (predictions[msg.sender][currentMatchId].timestamp != 0) revert MatchAlreadyPredicted();
            
            Match storage matchData = matches[currentMatchId];
            if (!matchData.exists) revert MatchNotRegistered();
            if (matchData.isRecorded) revert MatchAlreadyRecorded();
            
            // CRITICAL: Must be at least 10 minutes before match starts
            if (block.timestamp >= matchData.startTime - PREDICTION_DEADLINE) {
                revert PredictionDeadlinePassed();
            }
            
            predictions[msg.sender][currentMatchId] = Prediction({
                matchId: currentMatchId,
                outcome: outcomes[i],
                timestamp: block.timestamp,
                isProcessed: false
            });
            
            // Add to user's prediction history
            userPredictionHistory[msg.sender].push(currentMatchId);
        }
        
        // Update user stats
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
    
    /**
     * @notice Register matches for prediction (owner only)
     * @param matchIds Array of match IDs
     * @param startTimes Array of match start times (UNIX timestamp)
     */
    function registerMatches(
        uint256[] calldata matchIds, 
        uint256[] calldata startTimes
    ) external onlyOwner {
        if (matchIds.length != startTimes.length) revert InvalidMatchId();
        
        for (uint256 i = 0; i < matchIds.length; i++) {
            // Only register if not already registered and match is in future
            if (!matches[matchIds[i]].exists && startTimes[i] > block.timestamp) {
                matches[matchIds[i]] = Match({
                    id: matchIds[i],
                    startTime: startTimes[i],
                    homeScore: 0,
                    awayScore: 0,
                    isRecorded: false,
                    exists: true,
                    recordedAt: 0
                });
                
                totalMatches++;
                emit MatchRegistered(matchIds[i], startTimes[i]);
            }
        }
    }
    
    /**
     * @notice Record match results (owner only)
     * @param users Array of user addresses
     * @param matchIds Array of match IDs
     * @param corrects Array of correct/incorrect results
     */
    function batchRecordResults(
        address[] calldata users,
        uint256[] calldata matchIds,
        bool[] calldata corrects
    ) external onlyOwner {
        if (users.length != matchIds.length || matchIds.length != corrects.length) {
            revert InvalidMatchId();
        }
        
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
                emit ResultRecorded(users[i], matchIds[i], corrects[i], block.timestamp);
            }
        }
    }
    
    /**
     * @notice Update match result (owner only)
     * @param matchId Match ID
     * @param homeScore Home team score
     * @param awayScore Away team score
     */
    function updateMatchResult(
        uint256 matchId,
        uint256 homeScore,
        uint256 awayScore
    ) external onlyOwner {
        Match storage matchData = matches[matchId];
        require(matchData.exists, "Match does not exist");
        
        matchData.homeScore = homeScore;
        matchData.awayScore = awayScore;
        matchData.isRecorded = true;
        matchData.recordedAt = block.timestamp;
        
        emit MatchResultUpdated(matchId, homeScore, awayScore, block.timestamp);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get user statistics
     * @param user User address
     * @return User statistics
     */
    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }
    
    /**
     * @notice Get user prediction for a match
     * @param user User address
     * @param matchId Match ID
     * @return Prediction data
     */
    function getUserPrediction(address user, uint256 matchId) external view returns (Prediction memory) {
        return predictions[user][matchId];
    }
    
    /**
     * @notice Get match information
     * @param matchId Match ID
     * @return Match data
     */
    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }
    
    /**
     * @notice Get upcoming matches with limit
     * @param limit Maximum number of matches to return
     * @return matchIds Array of match IDs
     * @return startTimes Array of start times
     */
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
                matchData.startTime > currentTime + PREDICTION_DEADLINE && // Must be at least 10 minutes in future
                !matchData.isRecorded) {
                tempMatchIds[count] = i;
                tempStartTimes[count] = matchData.startTime;
                count++;
                if (count >= limit) break;
            }
        }
        
        // Create properly sized arrays
        matchIds = new uint256[](count);
        startTimes = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            matchIds[i] = tempMatchIds[i];
            startTimes[i] = tempStartTimes[i];
        }
    }
    
    /**
     * @notice Get match statistics
     * @return total Total matches
     * @return upcoming Upcoming matches
     * @return finished Finished matches
     * @return recorded Recorded matches
     */
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
    
    /**
     * @notice Get contract information
     * @return version Contract version
     * @return contractOwner Contract owner
     * @return contractTreasury Treasury address
     * @return isPaused Paused status
     * @return contractTotalMatches Total number of matches
     */
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
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Set treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Update leaderboard (called by cron job)
     */
    function updateLeaderboard() external onlyOwner {
        require(
            block.timestamp - lastLeaderboardUpdate >= 24 hours,
            "Leaderboard update too frequent"
        );
        
        lastLeaderboardUpdate = block.timestamp;
        emit LeaderboardUpdated(block.timestamp, 0);
    }
}