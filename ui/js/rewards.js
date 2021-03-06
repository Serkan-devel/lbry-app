import lbry from './lbry.js';
import lbryio from './lbryio.js';

function rewardMessage(type, amount) {
  return {
    new_developer: `You earned ${amount} for registering as a new developer.`,
    new_user: `You earned ${amount} LBC new user reward.`,
    confirm_email: `You earned ${amount} LBC for verifying your email address.`,
    new_channel: `You earned ${amount} LBC for creating a publisher identity.`,
    first_stream: `You earned ${amount} LBC for streaming your first video.`,
    many_downloads: `You earned ${amount} LBC for downloading some of the things.`,
    first_publish: `You earned ${amount} LBC for making your first publication.`,
  }[type];
}

const rewards = {};

rewards.TYPE_NEW_DEVELOPER = "new_developer",
  rewards.TYPE_NEW_USER = "new_user",
  rewards.TYPE_CONFIRM_EMAIL = "confirm_email",
  rewards.TYPE_FIRST_CHANNEL = "new_channel",
  rewards.TYPE_FIRST_STREAM = "first_stream",
  rewards.TYPE_MANY_DOWNLOADS = "many_downloads",
  rewards.TYPE_FIRST_PUBLISH = "first_publish";

rewards.claimReward = function (type) {

  function requestReward(resolve, reject, params) {
    if (!lbryio.enabled) {
      reject(new Error("Rewards are not enabled."))
      return;
    }
    lbryio.call('reward', 'new', params, 'post').then(({RewardAmount}) => {
      const
        message = rewardMessage(type, RewardAmount),
        result = {
          type: type,
          amount: RewardAmount,
          message: message
        };

      // Display global notice
      document.dispatchEvent(new CustomEvent('globalNotice', {
        detail: {
          message: message,
          linkText: "Show All",
          linkTarget: "?rewards",
          isError: false,
        },
      }));

      // Add more events here to display other places

      resolve(result);
    }, reject);
  }

  return new Promise((resolve, reject) => {
    lbry.get_new_address().then((address) => {
      const params = {
        reward_type: type,
        wallet_address: address,
      };

      switch (type) {
        case rewards.TYPE_FIRST_CHANNEL:
          lbry.claim_list_mine().then(function(claims) {
            let claim = claims.find(function(claim) {
              return claim.name.length && claim.name[0] == '@' && claim.txid.length
            })
            if (claim) {
              params.transaction_id = claim.txid;
              requestReward(resolve, reject, params)
            } else {
              reject(new Error("Please create a channel identity first."))
            }
          }).catch(reject)
          break;

        case rewards.TYPE_FIRST_PUBLISH:
          lbry.claim_list_mine().then((claims) => {
            let claim = claims.find(function(claim) {
              return claim.name.length && claim.name[0] != '@' && claim.txid.length
            })
            if (claim) {
              params.transaction_id = claim.txid
              requestReward(resolve, reject, params)
            } else {
              reject(claims.length ?
                     new Error("Please publish something and wait for confirmation by the network to claim this reward.") :
                     new Error("Please publish something to claim this reward."))
            }
          }).catch(reject)
          break;

        case rewards.TYPE_FIRST_STREAM:
        case rewards.TYPE_NEW_USER:
        default:
          requestReward(resolve, reject, params);
      }
    });
  });
}

rewards.claimNextPurchaseReward = function() {
  let types = {}
  types[rewards.TYPE_FIRST_STREAM] = false
  types[rewards.TYPE_MANY_DOWNLOADS] = false
  lbryio.call('reward', 'list', {}).then((userRewards) => {
    userRewards.forEach((reward) => {
      if (types[reward.RewardType] === false && reward.TransactionID) {
        types[reward.RewardType] = true
      }
    })
    let unclaimedType = Object.keys(types).find((type) => {
      return types[type] === false;
    })
    if (unclaimedType) {
      rewards.claimReward(unclaimedType);
    }
  }, () => { });
}

export default rewards;