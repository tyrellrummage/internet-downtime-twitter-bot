const ia = require('internet-available');
const fs = require('fs');
const Twit = require('twit');
const os = require('os');

// YOUR CONFIGURATION
let debug = true;   // push messages to console, don't push to twitter

let config = {
    ispName: '',
    twitterConsumerKey: '',
    twitterConsumerSecret: '',
    twitterAccessToken: '',
    twitterAccessTokenSecret: '',
    dataFile: 'data.dat',
    logFile: 'log.txt',
    checkInterval: (debug ? 5 : 20),
    checkTimeout: (debug ? 3 : 5),
};

// SYSTEM CONFIGURATION
const fileEncoding = 'utf8';


//HELPERS
const getLastStatus = () => { return fs.readFileSync(config.dataFile, fileEncoding).split(',')[2];}
const setLastStatus = msg => { fs.writeFileSync(config.dataFile, getOutageCounter() + ',' + getTimestamp() + ',' + msg);}

const getTimestamp = () => { return parseInt(fs.readFileSync(config.dataFile, fileEncoding)).split(',')[1];}
const setTimestamp = () => { fs.writeFileSync(config.dataFile, getOutageCounter() + ',' + new Date().getTime() + ',' + getLastStatus());}

const increaseOutageCounter = () => { let n = parseInt(getOutageCounter()) + 1; fs.writeFileSync(config.dataFile, n + ',' + getTimestamp() + ',' + getLastStatus());}
const getOutageCounter = () => { return fs.readFileSync(config.dataFile, fileEncoding).split(',')[0];}

const timestampToReadableTime = timestamp => { let date = new Date(timestamp); let hours = padNumber(date.getHours()); let minutes = padNumber(date.getMinutes()); let seconds = padNumber(date.getSeconds()); return `${hours}:${minutes}:${seconds}`;}
const padNumber = n => { return (n < 10) ? `0${n}` : n;}
const secondsToReadableTime = timestamp => { let floor = Math.floor; return {hours: floor(timestamp/3600), minutes: floor(timestamp/60) % 60, seconds: floor(timestamp % 60)};}
const formatTimePiece = (piece, string) => { return piece > 1 ? `${string}s` : string;}

const log = msg => { if(debug){ console.log(msg);}}
const tweet = content => { T.post('statuses/update', {status: content}, function(err, data, response){ if(err) { console.log(err); return;} console.log('Tweet sent!');});}

const updateLogFile = msg => { let currentContent = fs.readFileSync(config.logFile, fileEncoding); currentContent += msg + os.EOL; fs.writeFileSync(config.logFile, currentContent);}

const checkDataFile = () => {
  // check if data file exists, create if it doesn't
  if (!fs.existsSync(config.dataFile)) {
    log('> Data file not found, creating blank.')
    fs.writeFileSync(config.dataFile, '0,0,online');
  }
  
  // check if the data file is corrupt
  let read = fs.readFileSync(config.dataFile, fileEncoding).split(',');
  if (read.length != 3) {
    log('> Data file corrupt, creating blank.');
    fs.writeFileSync(config.dataFile, '0,0,online');
  }
}

// SET UP

// check if the twitter configuration exists
if ((config.twitterConsumerKey == '') || (config.twitterConsumerSecret == '') || (config.twitterAccessToken = '') || (config.twitterAccessTokenSecret == '')) {
  // if it doesn't, check if the environment variables exist
  if ((process.env.TWITTER_CONSUMER_KEY == undefined) || (process.env.TWITTER_CONSUMER_SECRET == undefined) || (process.env.TWITTER_ACCESS_TOKEN == undefined) || (process.env.TWITTER_ACCESS_TOKEN_SECRET == undefined)) {
    log('> Configuration error: You have not filled in your Twitter configuration (and unable to find in environment.');
    return false;
  } else {
    log('> Configuration found in environment.');
    config.twitterConsumerKey = process.env.TWITTER_CONSUMER_KEY;
    config.twitterConsumerSecret = process.env.TWITTER_CONSUMER_SECRET;
    config.twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN;
    config.twitterAccessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
  }
}

// check if isp is set
if (config.ispName == '') {
  log('> Configuration error: You have not filled in your ISP detail.');
  return false;
}

// check the data file consistency
checkDataFile();

log(`consumer_key: ${config.twitterConsumerKey}, consumer_secret: ${config.twitterConsumerSecret}, access_token: ${config.twitterAccessToken}, access_token_secret: ${config.twitterAccessToken_secret}`);

const T = new Twit({
	consumer_key: config.twitterConsumerKey,
	consumer_secret: config.twitterConsumerSecret,
	access_token: config.twitterAccessToken,
	access_token_secret: config.twitterAccessTokenSecret,
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

		let lastOutageTimestamp = getTimestamp(),
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

		let tweetContent = `#${config.ispName}'s Internet just went down for ${timeString}. From ${readableTimeLastOutage} to ${readableTimeNow}. It's the ${outageCounter}º time.`,
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