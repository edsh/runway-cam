# EDSH "Runway Cam" project

This is basically an [AWS SAM](https://aws.amazon.com/serverless/sam/) project with the purpose to make snapshots from our web cams that are only available as an RTSP stream.

## Introduction

### Get images from RTSP with ffmpeg
So far apparently only ffmpeg is enabled to make this possible. After a bit of [research](https://stackoverflow.com/questions/34904548/how-to-grab-a-single-image-from-rtsp-stream-using-ffmpeg) and experimenting, it turned out the following ffmpeg (cli) command does the job well:

```bash
ffmpeg -y -rtsp_transport tcp -i 'rtsp://the:stream@1.2.3.4/sub/path' -frames:v 1 rwypic.jpg
```

### Lambda with ffmpeg
Since ffmpeg is an application that required a couple of dependencies, a simple Lambda does not the trick. During research, I stumbled upon a [blog post](https://intoli.com/blog/transcoding-on-aws-lambda/) that leveraged a tool called Exodus <q>which greatly simplifies the process of relocating native binaries from one Linux system to another</q>. Still, that felt too much of an overhead.

With a fresh start a couple of weeks later when I looked at the issue again, I finally found what I thought was exactly the thin I needed: a ready-to-use "Lambda layer" that could be installed right from the <dfn><abbr title="Serverless Application Repository">SAR</abbr></dfn>: [@gojko](https://github.com/gojko)'s [ffmpeg-aws-lambda-layer](https://github.com/serverlesspub/ffmpeg-aws-lambda-layer).

### How it works

So basically the application declared in `template.yml` has a Lambda in place that is triggered by about every 10 minutes. This will just invoke the ffmpeg command mentioned above for two of our web cams and save the pictures in an S3 bucket.

The same lambda that does that also makes use of Amazon Rekognitions' `detectFaces` functionality and blurs the respective image portions. 

After storing the picture, the S3 bucket is accessible with a CloudFront distribution so that these pictures can be served into the web.

![Architecture overview](./docs/arch-overview.svg)

## Build/run

To deploy, 

```bash
$ sam deploy
```

To test the lambda locally,

```bash
$ sam build && sam local invoke SnapshotFileFunction --env-vars local-debug-env-vars.json 
```

## Credits where credit is due

Main credits go to [@gojko](https://github.com/gojko) for his repository mentioned above; it also contained examples that enabled me to get started on the whole AWS SAM stuff.

[@veelenga](https://github.com/veelenga)'s [aws-lambda-face-blur](https://github.com/veelenga/aws-lambda-face-blur) repository got me inspired and started to blur the faces that are shot on the web cam stream. Since the webcam images are supposed to be publicy viewable on the internet I thought this was a nice idea to add for some additional privacy.

Another lot of the scaffolding has been done by the `sam init` wizards; bear with me (or make a PR) if there's some leftovers I didn't clean up.

## License

* These scripts: [MIT](https://opensource.org/licenses/MIT)
* FFmpeg: http://ffmpeg.org/legal.html