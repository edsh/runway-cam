const
	AWS = require("aws-sdk"),
	childProcessPromise = require("../util/child-process-promise"),
	path = require("path"),
	os = require("os"),
	fs = require("fs"),
	gm = require("gm").subClass({ imageMagick: true }),
	moment = require("moment"),
	EXTENSION = process.env.EXTENSION,
	//THUMB_WIDTH = process.env.THUMB_WIDTH,
	OUTPUT_BUCKET = process.env.OUTPUT_BUCKET,
	MIME_TYPE = process.env.MIME_TYPE,
	INPUT_URLS = process.env.INPUT_URLS_CSV.split(","),

	s3 = new AWS.S3(),
	reko = new AWS.Rekognition(),

	expiry = (now, interval) => {
		return now
			.add(interval - (now.minute() % interval), "minutes")
			.startOf("minute")
			.subtract(1, "seconds");
	}

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
					{ env: process.env, cwd: workdir }
				)
					.then(() => fs.promises.readFile(outputFile))
					.then(async (outputFileBuffer) => {
						const rekoData =
							await reko.detectFaces({ // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Rekognition.html#detectFaces-property
								Image: { Bytes: fs.readFileSync(outputFile) },
								Attributes: ["DEFAULT"]
							}).promise();

						if (rekoData.FaceDetails.length === 0) {
							return new Promise((resolve) => {
								resolve([outputFileBuffer, rekoData.FaceDetails]);
							})
						}

						let img = gm(response.Body);
						img.size((err, value) => {
							rekoData.FaceDetails.forEach((faceDetail) => {
								const box = faceDetail.BoundingBox,
									width = box.Width * value.width,
									height = box.Height * value.height,
									left = box.Left * value.width,
									top = box.Top * value.height;

								img.region(width, height, left, top).blur(0, 50);
							});

							img.toBuffer((err, buffer) => {
								return new Promise((resolve) => {
									resolve([buffer, rekoData.FaceDetails]);
								});
							});
						})
					})
					.then(([buffer, rekoFaceDetails]) => {
						return s3.upload({
							Bucket: OUTPUT_BUCKET,
							Key: "rwy" + i + ".jpg",
							Body: buffer,
							ACL: 'private',
							ContentType: MIME_TYPE,
							Expires: expiry(moment.utc(), 10).toDate(),
							Metadata: { "x-edsh-facesdetected": rekoFaceDetails.length.toString() }
						}).promise();
					});
				//.then(() => s3Util.uploadFileToS3(OUTPUT_BUCKET, "rwy"+i+".jpg", outputFile, MIME_TYPE));
			}));

};
