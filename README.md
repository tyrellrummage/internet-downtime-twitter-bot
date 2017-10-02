# internet-downtime-twitter-bot
Twitter bot that sends a tweet everytime that your internet goes down.

Configuration:

- isp_name: your isp name, just to name bash
- twitter_consumer_key: your twitter consumer key, from https://apps.twitter.com/ - this can be set as an environment variable
- twitter_consumer_secret: your twitter consumer secret, from https://apps.twitter.com/ - this can be set as an environment variable
- twitter_access_token: your twitter access token, from https://apps.twitter.com/ - this can be set as an environment variable
- twitter_access_token_secret: your twitter access token secret, from https://apps.twitter.com/ - this can be set as an environment variable
- debug (default = true): logs info and tweets into the console (for actually tweeting, set false)
- checkInterval (depends on debug), time in seconds for the loop that checks connection interval
- checkTimeout (depends on debug), time in seconds to wait before returning that internet's down

- Files log names
- File encoding (default UTF8) for reading

Of course you can tweak anything. Have fun!
Also, feel free to contact me on reddit if you have any doubts ([/u/tyrellrummage](https://www.reddit.com/u/tyrellrummage)).

To run it, go the the same directory (folder) where you have it and run `node app.js` on your console.
