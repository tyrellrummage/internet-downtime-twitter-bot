const ia = require('internet-available');
const fs = require('fs');
const Twit = require('twit');
const os = require('os');

//CONFIG VARIABLES

const T = new Twit({
	consumer_key: '',
	consumer_secret: '',
	access_token: '',
	access_token_secret: '',
	timeout_ms: 15*1000
});

let counter = 0;
let debug = true;
let checkInterval = debug ? 5 : 20;
let checkTimeout = debug ? 3 : 5;

let ISPName = '';

let files = {
	lastStatus: 'last-status.txt',
	outageCounter: 'outage-counter.txt',
	timestamp: 'timestamp.txt',
	log: 'log.txt'
}

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

//LOOP

const loop = () => {
	log(`Loop iteration Nº ${counter}`);
	counter++;

	ia({
		timeout: checkTimeout * 1000
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

		let tweetContent = `#${ISPName}'s Internet just went down for ${timeString}. From ${readableTimeLastOutage} to ${readableTimeNow}. It's the ${outageCounter}º time.`,
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
setInterval(loop, 1000 * checkInterval);