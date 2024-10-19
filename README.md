# apnea_timer

## Project Description

The Freediving Apnea Timer is a web application designed to help freedivers train their breath-holding capabilities. The timer includes a countdown feature, an apnea timer, and beep intervals to assist with training sessions.

## How to Use

1. Open the web application in your browser.
2. Click the "Start" button to begin the countdown.
3. The timer will start counting down from the specified countdown time.
4. Once the countdown reaches zero, the apnea timer will start.
5. The apnea timer will count up from zero, displaying the elapsed time.
6. Click the "Stop" button to stop the apnea timer.
7. Click the "Restart" button to reset the timer and start again.

## URL Parameters

The following URL parameters can be set to customize the timer:

- `countdown`: The countdown time in seconds before the apnea timer starts. Default value is 1 second.
- `beep`: A comma-separated list of seconds at which the timer will emit a beep sound. For example, `beep=30,60,90` will beep at 30, 60, and 90 seconds.

To set these parameters, add them to the URL as query parameters. For example:

```
http://yourdomain.com?countdown=5&beep=30,60,90
```
