// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SeersLeague
 * @notice Daily football prediction competition with free trial
 * @dev First 5 predictions free, then $1 USDC per day
 */
contract SeersLeague is Ownable, Pausable, ReentrancyGuard {
    // Base Mainnet USDC
    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
    
    // Entry fee: $1 USDC (6 decimals)
    uint256 public constant ENTRY_FEE = 1_000_000; // 1 USDC
    
    // Treasury address for collected fees
    address public treasury;
    
    struct Prediction {
        uint32 matchId;
        uint8 outcome;        // 1=Home, 2=Draw, 3=Away
        uint32 timestamp;
    }
    
    struct UserStats {
        uint16 correctPredictions;
        uint16 totalPredictions;
        uint16 currentStreak;
        uint16 longestStreak;
        uint32 lastPredictionDate;     // YYYYMMDD format
        bool hasUsedFreeTrial;         // Track if user used free 5 predictions
    }
    
    struct DailyPool {
        uint256 totalFees;
        uint256 participantCount;
        bool distributed;
    }
    
    // Mappings
    mapping(address => UserStats) public userStats;
    mapping(address => mapping(uint32 => Prediction)) public predictions;
    mapping(uint32 => DailyPool) public dailyPools;  // date => pool info
    
    // Events
    event PredictionsSubmitted(
        address indexed user, 
        uint32[] matchIds, 
        bool freeTrial,
        uint256 feePaid
    );
    
    event ResultRecorded(
        address indexed user, 
        uint32 matchId, 
        bool correct
    );
    
    event PrizesDistributed(
        uint32 indexed date,
        uint256 totalAmount,
        uint256 recipientCount
    );
    
    event TreasuryUpdated(address indexed newTreasury);
    
    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }
    
    /**
     * @notice Submit 5 daily predictions
     * @param matchIds Array of 5 match IDs
     * @param outcomes Array of 5 outcomes (1/2/3)
     * @dev First time free, subsequent days require USDC payment
     */
    function submitPredictions(
        uint32[] calldata matchIds,
        uint8[] calldata outcomes
    ) external nonReentrant whenNotPaused {
        require(matchIds.length == 5, "Must predict exactly 5 matches");
        require(outcomes.length == 5, "Must provide 5 outcomes");
        
        UserStats storage stats = userStats[msg.sender];
        uint32 today = _getTodayDate();
        
        // Check if already predicted today
        require(stats.lastPredictionDate != today, "Already predicted today");
        
        // Handle payment
        bool isFreeTrial = !stats.hasUsedFreeTrial;
        
        if (!isFreeTrial) {
            // Collect $1 USDC entry fee
            require(
                USDC.transferFrom(msg.sender, treasury, ENTRY_FEE),
                "USDC transfer failed"
            );
            
            // Track daily pool
            dailyPools[today].totalFees += ENTRY_FEE;
            dailyPools[today].participantCount++;
        } else {
            // Mark free trial as used
            stats.hasUsedFreeTrial = true;
        }
        
        // Store predictions
        for (uint256 i = 0; i < 5; i++) {
            require(outcomes[i] >= 1 && outcomes[i] <= 3, "Invalid outcome");
            require(
                predictions[msg.sender][matchIds[i]].timestamp == 0,
                "Match already predicted"
            );
            
            predictions[msg.sender][matchIds[i]] = Prediction({
                matchId: matchIds[i],
                outcome: outcomes[i],
                timestamp: uint32(block.timestamp)
            });
        }
        
        // Update user stats
        stats.totalPredictions += 5;
        stats.lastPredictionDate = today;
        
        emit PredictionsSubmitted(
            msg.sender, 
            matchIds, 
            isFreeTrial,
            isFreeTrial ? 0 : ENTRY_FEE
        );
    }
    
    /**
     * @notice Record match result (owner only)
     * @param user User address
     * @param matchId Match ID
     * @param correct Whether prediction was correct
     */
    function recordResult(
        address user,
        uint32 matchId,
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
        uint32[] calldata matchIds,
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
     * @param date Date of competition (YYYYMMDD)
     * @param winners Array of winner addresses
     * @param amounts Array of prize amounts
     */
    function distributePrizes(
        uint32 date,
        address[] calldata winners,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(winners.length == amounts.length, "Length mismatch");
        require(!dailyPools[date].distributed, "Already distributed");
        
        uint256 totalDistribution;
        
        for (uint256 i = 0; i < winners.length; i++) {
            require(
                USDC.transferFrom(treasury, winners[i], amounts[i]),
                "Prize transfer failed"
            );
            totalDistribution += amounts[i];
        }
        
        dailyPools[date].distributed = true;
        
        emit PrizesDistributed(date, totalDistribution, winners.length);
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
    function getUserPrediction(address user, uint32 matchId)
        external
        view
        returns (Prediction memory)
    {
        return predictions[user][matchId];
    }
    
    /**
     * @notice Get daily pool information
     */
    function getDailyPool(uint32 date)
        external
        view
        returns (DailyPool memory)
    {
        return dailyPools[date];
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
        return (uint256(stats.correctPredictions) * 100) / stats.totalPredictions;
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
    
    /**
     * @dev Get today's date in YYYYMMDD format
     */
    function _getTodayDate() private view returns (uint32) {
        return uint32(block.timestamp / 86400);
    }
}
