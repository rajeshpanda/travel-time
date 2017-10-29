'use strict';

var Alexa = require('alexa-sdk');
var http = require('https');


exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context, callback);
    alexa.appId = '#ALEXA_APP_ID';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

function MakeHttpCall(pathParam) {
    return new Promise((resolve, reject) => {
        var result = '';
        http.get(pathParam, function (resp) {
            resp.on('data', function (chunk) {
                result += chunk.toString();
            });
            resp.on('end', function () {
                resolve(JSON.parse(result));
            });
        }).on("error", function (e) {
            console.log("Got error: " + e.message);
            reject();
        });
    });
}

const handlers = {
    'LaunchRequest': function () {
        this.emit('Greet');
    },
    'Greet': function () {
        const reprompt = 'Ask a travel time question.';
        this.response.speak('Hello Traveller! I can help you with guessing your travel time and distance.').listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = 'I can help you with guessing your travel time. Try asking how much time will it take from Mill City Museum, Minnesota to East Village Apartments, Minnesota';

        this.response.speak(speechOutput).reprompt("Go ahead.");
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak('I guess you are fine. Goodluck');
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak('See you later!');
        this.emit(':responseReady');
    },
    'TravelTimeIntent': function () {
        var self = this;
        var origin = this.event.request.intent.slots.ORIGIN.value;
        var dest = this.event.request.intent.slots.DESTINATION.value;
        var avoid = this.event.request.intent.slots.AVOID.value;
        var g_str = 'https://maps.googleapis.com/maps/api/directions/json?origin=STARTINGPT&destination=ENDINGPT&departure_time=TIMESTAMP&traffic_model=best_guess&key=API_KEY';

        var speechOutput = 'I don\' t quite get it. Unfamiliar places may be.';
        var reprompt = 'Try saying something like this; how much time will it take from Mill City Museum, Minnesota to East Village Apartments, Minnesota';


        var timeStamp = new Date().getTime();        var originEncoded = origin.replace(/ /g, '+');
        var destEncoded = dest.replace(/ /g, '+');

        if (!origin) {
            speechOutput = 'I did not catch the origin.';
            this.response.speak(speechOutput).listen(reprompt);
            this.emit(':responseReady');
        }
        else if (!dest) {
            speechOutput = 'Specify the destination clearly.';
            this.response.speak(speechOutput).listen(reprompt);
            this.emit(':responseReady');
        }
        else {
            g_str = g_str.replace('STARTINGPT', originEncoded);
            g_str = g_str.replace('ENDINGPT', destEncoded);
            g_str = g_str.replace('TIMESTAMP', timeStamp);
            if (avoid) {
                if (avoid.indexOf('toll') >= 0 && avoid.indexOf('h') < 0)
                    g_str = g_str + '&avoid=tolls';
                else if (avoid.indexOf('toll') < 0 && avoid.indexOf('h') >= 0)
                    g_str = g_str + '&avoid=highways';
                else {
                    g_str = g_str + '&avoid=tolls|highways';
                }
            }
            MakeHttpCall(g_str)
                .then((response) => {
                    if (response.routes[0].legs[0].duration_in_traffic.text) {
                        var trafficTime = response.routes[0].legs[0].duration_in_traffic.text;
                        var avgTime = response.routes[0].legs[0].duration.text;
                        var distance = response.routes[0].legs[0].distance.text;
                        speechOutput = 'Considering the traffic, it should take you ' + trafficTime + '; The average time is about ' + avgTime + ' to cover this distance of ' + distance + '; Good luck';
                        self.response.speak(speechOutput);
                        self.emit(':responseReady');
                    }   
                    else {
                        self.response.speak(speechOutput).listen('Try again.');
                        self.emit(':responseReady');
                    }
                }).catch(() => {
                    self.response.speak(speechOutput).listen('Try again.');
                    self.emit(':responseReady');
                });

        }
    }
};
