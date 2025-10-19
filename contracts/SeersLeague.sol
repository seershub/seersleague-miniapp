// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SeersLeague
 * @notice Flexible football prediction competition with per-match pricing
 * @dev First 5 predictions free, then 0.5 USDC per match
 */
contract SeersLeague is Ownable, Pausable, ReentrancyGuard {
    // Base Mainnet USDC
    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
    
    // Per-match fee: 0.5 USDC (6 decimals)
    uint256 public constant PREDICTION_FEE = 500_000; // 0.5 USDC
    
    // Total free predictions per user
    uint256 public constant TOTAL_FREE_PREDICTIONS = 5;
    
    // Treasury address for collected fees
    address public treasury;
    
    struct Match {
        uint256 id;
        uint256 startTime;    // UNIX timestamp when match starts
        uint256 homeScore;
        uint256 awayScore;
        bool isRecorded;
        bool exists;
    }
    
    struct Prediction {
        uint256 matchId;
        uint8 outcome;        // 1=Home, 2=Draw, 3=Away
        uint256 timestamp;
    }
    
    struct UserStats {
        uint256 correctPredictions;
        uint256 totalPredictions;
        uint256 freePredictionsUsed;  // Track used free predictions
        uint256 currentStreak;
        uint256 longestStreak;
    }
    
    // Mappings
    mapping(address => UserStats) public userStats;
    mapping(address => mapping(uint256 => Prediction)) public predictions;
    mapping(uint256 => Match) public matches;
    
    // Events
    event PredictionsSubmitted(
        address indexed user, 
        uint256[] matchIds, 
        uint256 predictionsCount,
        uint256 freeUsed,
        uint256 feePaid
    );
    
    event MatchRegistered(
        uint256 indexed matchId,
        uint256 startTime
    );
    
    event ResultRecorded(
        address indexed user, 
        uint256 matchId, 
        bool correct
    );
    
    event PrizesDistributed(
        address[] winners,
        uint256 totalAmount,
        uint256 recipientCount
    );
    
    event TreasuryUpdated(address indexed newTreasury);
    
    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }
    
    /**
     * @notice Submit flexible number of predictions
     * @param matchIds Array of match IDs
     * @param outcomes Array of outcomes (1/2/3)
     * @dev First 5 predictions free, then 0.5 USDC per match
     */
    function submitPredictions(
        uint256[] calldata matchIds,
        uint8[] calldata outcomes
    ) external nonReentrant whenNotPaused {
        require(matchIds.length > 0, "Must submit at least one prediction");
        require(matchIds.length == outcomes.length, "Data mismatch");
        
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
            require(
                USDC.transferFrom(msg.sender, treasury, totalFee),
                "USDC transfer failed"
            );
        }
        
        // Store predictions with security checks
        for (uint256 i = 0; i < predictionsInBatch; i++) {
            uint256 currentMatchId = matchIds[i];
            require(outcomes[i] >= 1 && outcomes[i] <= 3, "Invalid outcome");
            require(
                predictions[msg.sender][currentMatchId].timestamp == 0,
                "Match already predicted"
            );
            
            Match storage matchData = matches[currentMatchId];
            
            // --- SECURITY LOCKS ---
            require(matchData.exists, "Match is not registered");
            require(block.timestamp < matchData.startTime, "Prediction deadline passed");
            require(!matchData.isRecorded, "Match results already recorded");
            // --- SECURITY LOCKS ---
            
            predictions[msg.sender][currentMatchId] = Prediction({
                matchId: currentMatchId,
                outcome: outcomes[i],
                timestamp: block.timestamp
            });
        }
        
        // Update user stats
        userStatsData.totalPredictions += predictionsInBatch;
        
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
     * @dev Only callable by owner to register matches from API
     */
    function registerMatches(
        uint256[] calldata matchIds, 
        uint256[] calldata startTimes
    ) external onlyOwner {
        require(matchIds.length == startTimes.length, "Data mismatch");
        
        for (uint256 i = 0; i < matchIds.length; i++) {
            // Only register if not already registered and match is in future
            if (!matches[matchIds[i]].exists && startTimes[i] > block.timestamp) {
                matches[matchIds[i]] = Match({
                    id: matchIds[i],
                    startTime: startTimes[i],
                    homeScore: 0,
                    awayScore: 0,
                    isRecorded: false,
                    exists: true
                });
                
                emit MatchRegistered(matchIds[i], startTimes[i]);
            }
        }
    }
    
    /**
     * @notice Record match result (owner only)
     * @param user User address
     * @param matchId Match ID
     * @param correct Whether prediction was correct
     */
    function recordResult(
        address user,
        uint256 matchId,
        bool correct
    ) external onlyOwner {
        require(
            predictions[user][matchId].timestamp > 0,
            "No prediction found"
        );
        
        UserStats storage stats = userStats[user];
        
        if (correct) {
            stats.correctPredictions++;
            stats.currentStreak++;
            
            if (stats.currentStreak > stats.longestStreak) {
                stats.longestStreak = stats.currentStreak;
            }
        } else {
            stats.currentStreak = 0;
        }
        
        emit ResultRecorded(user, matchId, correct);
    }
    
    /**
     * @notice Batch record results for multiple users
     * @param users Array of user addresses
     * @param matchIds Array of match IDs
     * @param corrects Array of correct/incorrect flags
     */
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
            if (predictions[users[i]][matchIds[i]].timestamp > 0) {
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
                
                emit ResultRecorded(users[i], matchIds[i], corrects[i]);
            }
        }
    }
    
    /**
     * @notice Distribute prizes to winners (owner only)
     * @param winners Array of winner addresses
     * @param amounts Array of prize amounts
     */
    function distributePrizes(
        address[] calldata winners,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(winners.length == amounts.length, "Length mismatch");
        
        uint256 totalDistribution;
        
        for (uint256 i = 0; i < winners.length; i++) {
            require(
                USDC.transferFrom(treasury, winners[i], amounts[i]),
                "Prize transfer failed"
            );
            totalDistribution += amounts[i];
        }
        
        emit PrizesDistributed(winners, totalDistribution, winners.length);
    }
    
    /**
     * @notice Get user statistics
     */
    function getUserStats(address user) 
        external 
        view 
        returns (UserStats memory) 
    {
        return userStats[user];
    }
    
    /**
     * @notice Get user's prediction for a match
     */
    function getUserPrediction(address user, uint256 matchId)
        external
        view
        returns (Prediction memory)
    {
        return predictions[user][matchId];
    }
    
    /**
     * @notice Get match information
     */
    function getMatch(uint256 matchId)
        external
        view
        returns (Match memory)
    {
        return matches[matchId];
    }
    
    /**
     * @notice Calculate user's accuracy percentage
     */
    function getUserAccuracy(address user)
        external
        view
        returns (uint256)
    {
        UserStats memory stats = userStats[user];
        if (stats.totalPredictions == 0) return 0;
        return (stats.correctPredictions * 100) / stats.totalPredictions;
    }
    
    /**
     * @notice Get user's remaining free predictions
     */
    function getRemainingFreePredictions(address user)
        external
        view
        returns (uint256)
    {
        UserStats memory stats = userStats[user];
        if (stats.freePredictionsUsed >= TOTAL_FREE_PREDICTIONS) {
            return 0;
        }
        return TOTAL_FREE_PREDICTIONS - stats.freePredictionsUsed;
    }
    
    /**
     * @notice Update treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }
    
    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
}
