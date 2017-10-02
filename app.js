const ia = require('internet-available');
const fs = require('fs');
const Twit = require('twit');
const os = require('os');

// YOUR CONFIGURATION
let debug = true;   // push messages to console, don't push to twitter

let config = {
    isp_name: '',
    twitter_consumer_key: '',
    twitter_consumer_secret: '',
    twitter_access_token: '',
    twitter_access_token_secret: '',
    checkInterval: (debug ? 5 : 20),
    checkTimeout: (debug ? 3 : 5),
};


let files = {
	lastStatus: 'last-status.txt',
	outageCounter: 'outage-counter.txt',
	timestamp: 'timestamp.txt',
	log: 'log.txt'
}

// SYSTEM CONFIGURATION
let fileEncoding = 'utf8';


//HELPERS
const getLastStatus = () => { return fs.readFileSync(files.lastStatus, fileEncoding);}
const setLastStatus = msg => { fs.writeFileSync(files.lastStatus, msg);}

const getTimetsamp = () => { return parseInt(fs.readFileSync(files.timestamp, fileEncoding));}
const setTimestamp = () => { fs.writeFileSync(files.timestamp, new Date().getTime());}

const increaseOutageCounter = () => { let n = parseInt(getOutageCounter()) + 1; fs.writeFileSync(files.outageCounter, n);}
const getOutageCounter = () => { return fs.readFileSync(files.outageCounter, fileEncoding);}

const timestampToReadableTime = timestamp => { let date = new Date(timestamp); let hours = padNumber(date.getHours()); let minutes = padNumber(date.getMinutes()); let seconds = padNumber(date.getSeconds()); return `${hours}:${minutes}:${seconds}`;}
const padNumber = n => { return (n < 10) ? `0${n}` : n;}
const secondsToReadableTime = timestamp => { let floor = Math.floor; return {hours: floor(timestamp/3600), minutes: floor(timestamp/60) % 60, seconds: floor(timestamp % 60)};}
const formatTimePiece = (piece, string) => { return piece > 1 ? `${string}s` : string;}

const log = msg => { if(debug){ console.log(msg);}}
const tweet = content => { T.post('statuses/update', {status: content}, function(err, data, response){ if(err) { console.log(err); return;} console.log('Tweet sent!');});}

const updateLogFile = msg => { let currentContent = fs.readFileSync(files.log, fileEncoding); currentContent += msg + os.EOL; fs.writeFileSync(files.log, currentContent);}


// SET UP

// check if the twitter configuration exists
if ((config.consumer_key == '') || (config.consumer_secret == '') || (config.access_token = '') || (config.access_token_secret == '')) {
  // if it doesn't, check if the environment variables exist
  if ((process.env.TWITTER_CONSUMER_KEY == undefined) || (process.env.TWITTER_CONSUMER_SECRET == undefined) || (process.env.TWITTER_ACCESS_TOKEN == undefined) || (process.env.TWITTER_ACCESS_TOKEN_SECRET == undefined)) {
    log('> Configuration error: You have not filled in your Twitter configuration (and unable to find in environment.');
    return false;
  } else {
    log('> Configuration found in environment.');
    config.twitter_consumer_key = process.env.TWITTER_CONSUMER_KEY;
    config.twitter_consumer_secret = process.env.TWITTER_CONSUMER_SECRET;
    config.twitter_access_token = process.env.TWITTER_ACCESS_TOKEN;
    config.twitter_access_token_secret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  }
}

if (config.isp_name == '') {
  log('> Configuration error: You have not filled in your ISP detail.');
  return false;
}

log(`consumer_key: ${config.twitter_consumer_key}, consumer_secret: ${config.twitter_consumer_secret}, access_token: ${config.twitter_access_token}, access_token_secret: ${config.twitter_access_token_secret}`);
const T = new Twit({
	consumer_key: config.twitter_consumer_key,
	consumer_secret: config.twitter_consumer_secret,
	access_token: config.twitter_access_token,
	access_token_secret: config.twitter_access_token_secret,
	timeout_ms: 15*1000
});

let counter = 0;  // loop counter
// LOOP

const loop = () => {
	log(`Loop iteration Nº ${counter}`);
	counter++;

	ia({
		timeout: config.checkTimeout * 1000
	}).then(function(){
		log('Now online');
		let ls = getLastStatus();

		if(ls != 'offline'){
			return;
		}

		log('Internet\'s back');

		let lastOutageTimestamp = getTimetsamp(),
			now = new Date().getTime(),
			deltaSeconds = (now - lastOutageTimestamp)/1000,
			readableTime = secondsToReadableTime(deltaSeconds),
			hours = readableTime.hours,
			minutes = readableTime.minutes,
			seconds = readableTime.seconds,
			outageCounter = getOutageCounter(),
			timeString = '';

		let paddedSeconds = padNumber(seconds),
			paddedMinutes = padNumber(minutes),
			paddedHours = padNumber(hours);

		let secondString = formatTimePiece(seconds, 'second'),
			minuteString = formatTimePiece(minutes, 'minute'),
			hourString = formatTimePiece(hours, 'hour');

		if(hours > 0){ timeString = `${hours} ${hourString}, ${minutes} ${minuteString} y ${paddedSeconds} ${secondString}`}else if(minutes < 1){ timeString = `${seconds} ${secondString}`;}else if(seconds == 0){ timeString = `${minutes} ${minuteString}`;}else{ timeString = `${minutes} ${minuteString} y ${paddedSeconds} ${secondString}`}

		let readableTimeLastOutage = timestampToReadableTime(lastOutageTimestamp),
			readableTimeNow = timestampToReadableTime(now);

		let tweetContent = `#${config.isp_name}'s Internet just went down for ${timeString}. From ${readableTimeLastOutage} to ${readableTimeNow}. It's the ${outageCounter}º time.`,
			logContent = `Internet Connection Failure. Downtime: ${paddedHours}:${paddedMinutes}:${paddedSeconds}. From ${readableTimeLastOutage} to ${readableTimeNow}. Connection failure Nº ${outageCounter}.`;

		updateLogFile(logContent);
		if(!debug){
			tweet(tweetContent);
		}
		setLastStatus('online');

	}).catch(function(){
		log('Now offline');
		let ls = getLastStatus();

		if(ls != 'online'){
			return;
		}

		log('Internet\'s out');
		setTimestamp();
		if(!debug){ increaseOutageCounter(); }
		setLastStatus('offline');
	});
}

// INITIALIZE LOOP

loop();
setInterval(loop, 1000 * config.checkInterval);