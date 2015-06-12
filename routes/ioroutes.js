
var express = require('express'),
    https = require('https'),
	querystring = require('querystring'),
	body = "",
	returnValue = "",
	accessToken = process.env.SPARKACCESSTOKEN; //process.env.SPARKACCESSTOKEN

var httpsOptions = {
	hostname: 'api.spark.io',
	port: 443,
	path: '/v1/devices/' + process.env.ZEDDEVICE + '/sumocar', //process.env.ZEDDEVICE
	method: 'POST',
	headers: {
		'Accept': '*/*',
		'Accept-Language': 'en-US,en;q=0.8',
		'Accept-Encoding': 'gzip,deflate,sdch',
		'Content-Type': 'application/x-www-form-urlencoded'
	}
};

function convertLRValuesToLRServo(motorObject) {
  var left = 90, right = 90;
  left = (motorObject.L + 100) * 0.9;
  right = 180 - (motorObject.R + 100) * 0.9;
  return {
    "L": left,
    "R": right
  };
}

function callSparkService(postData, res) {
	var post_data = postData;
	httpsOptions.headers['Content-Length'] = post_data.length;
	var retValue = "";
	var request = https.request(httpsOptions, function(response) {
		console.log('STATUS: ' + response.statusCode);
		response.setEncoding('utf8');
		response.on('data', function (chunk) {
			//console.log('BODY: ' + chunk);
			retValue += chunk;
		});
		response.on('end', function() {
			console.log('request has ended.');
			//console.log(body);
			//retValue = JSON.parse(body);
			res.send(retValue);
		});
	});
	
	request.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});

	// write data to request body
	request.write(post_data);
	request.end();
}

/**
 * This function converts the accelerometer data into Servo motor inputs 
 */
function getServoPower(x, y) {
  if (x > 1000) {
    x = 1000;
  }
  if (x < -1000) {
    x = -1000;
  }
  if (y > 1000) {
    y = 1000;
  }
  if (y < -1000) {
    y = -1000;
  }
  
	var right = y / 10, left = y / 10, diff = 0;
	right -=  (x/10);
	left +=  (x/10); 
  
	if (right > 100) {
		diff = right - 100;
	}
	if (left > 100) {
		diff = left - 100;
	}
	if (right < -100) {
		diff = right + 100;
	}
	if (left < -100)
	{
		diff = left + 100;
	}
	right -= diff;
	left -= diff;
   
	return { "L": left, "R": right };
}

module.exports = function(io) {
    var router = express.Router();

    router.get('/test', function (req, res, next) {
      res.render('index', { title: 'Express' });
    });
    
    router.get('/accel/:x/:y/:z', function (req, res, next) {
      var xaxis = req.params.x;
      var yaxis = req.params.y;
      var servoPower = convertLRValuesToLRServo(getServoPower(xaxis, yaxis));
      // Convert L R values to CW and CCW servo values. i.e. -100 = 0, 100 = 180
      console.log(servoPower);
      io.emit('acceldata', { "x": req.params.x, "y": req.params.y, "z": req.params.z });
      var post_data = querystring.stringify({
    		'access_token': accessToken,
    		'params': servoPower.L + ',' + servoPower.R
    	});
    	callSparkService(post_data, res);
    });
    
    return router;
};