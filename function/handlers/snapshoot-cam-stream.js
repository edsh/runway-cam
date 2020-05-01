const 
	s3Util = require('../util/s3'),
	childProcessPromise = require('../util/child-process-promise'),
	path = require('path'),
	os = require('os'),
	EXTENSION = process.env.EXTENSION,
	//THUMB_WIDTH = process.env.THUMB_WIDTH,
	OUTPUT_BUCKET = process.env.OUTPUT_BUCKET,
	MIME_TYPE =  process.env.MIME_TYPE,
	INPUT_URLS = process.env.INPUT_URLS_CSV.split(',');

exports.handler = async (event, context) => {
	const
		id = context.awsRequestId,
		workdir = os.tmpdir();
	;

	return Promise.all(
		INPUT_URLS.map(
			(url, i) => {
				const outputFile = path.join(workdir, id + i + "." + EXTENSION);
				return childProcessPromise.spawn(
					
						'/opt/bin/ffmpeg',
						[
							'-loglevel',
							'error',
							'-y',
							'-rtsp_transport',
							'tcp',
							'-i',
							url,
							//'-vf',
							//`thumbnail,scale=${THUMB_WIDTH}:-1`,
							'-frames:v',
							'1',
							outputFile
						],
						{env: process.env, cwd: workdir}
					)
					.then(() => s3Util.uploadFileToS3(OUTPUT_BUCKET, "rwy"+i+".jpg", outputFile, MIME_TYPE));
			}));
    
};
