const cp = require('child_process');

const keys = {
    pause: 'p',
    stop: 'q',
    status: 'o',
    seekBackward: 'Left',
    seekForward: 'Right',
    bigSeekBackward: 'Down',
    bigSeekForward: 'Up'
};

const pausedStrings = [
    "(Paused)",
    "(Buffering)"
];

class mpv {
    constructor(statusListener) {
        this.statusListener = statusListener;
        this.statusLimit = 1;
        this.statusCounter = 0;
        this.open = false;
    }

    limitStatusMessages(mod) {
        this.statusLimit = mod < 1 ? 1 : mod;
    }

    play(first, second, third) {
        let flags = [];
        if (Array.isArray(first)) {
            flags = flags.concat(first);
        } else {
            flags.push(first);
            if (Array.isArray(second)) {
                flags = flags.concat(second);
            } else {
                flags.push('--sub="' + second + '"');
                if (Array.isArray(third)) {
                    flags = flags.concat(third);
                }
            }
        }
        this.player = cp.spawn('mpv', flags);
        this.preparePlayer();
    }

    preparePlayer() {
        this.player.stdin.setEncoding('utf8');
        this.player.stderr.setEncoding('utf8');
        this.player.stderr.on('data', this.handleData.bind(this));
        this.player.stderr.on('close', this.closed.bind(this));
    }

    closed() {
        if (typeof this.statusListener !== 'undefined' && this.open) {
            this.open = false;
            this.statusListener({
                exit: true
            });
        }
    }

    handleData(data) {
        this.open = true;
        if (typeof this.statusListener !== 'undefined'
                && this.statusCounter++ % this.statusLimit === 0) {
            let status = this.parseData(data.toString());
            this.statusListener(status);
        }
    }

    parseData(data) {
        let parts = data.split(' ');

        let playing = pausedStrings.indexOf(parts[0]) === -1;
        let buffering = parts[0] === pausedStrings[1];
        if (!playing) {
            parts.shift();
        }

        let percentage = parts[4].replace(/\(|\)|%/g, '')
        let status = {
            playing: playing,
            buffering: buffering,
            elapsed: parts[1],
            total: parts[3],
            progress: percentage / 100
        }

        return status;
    }

    // Should be done with this.player.stdin.write(key) which I can't manage to
    // get working.
    sendKey(key) {
        if (this.open) {
            cp.exec('xdotool search --name " - mpv"', (_, result) => {
                result = result.trim();
                cp.exec('xdotool key --window ' + result + ' ' + key);
            });
        }
    }

    // This force kills mpv.
    kill() {
        cp.exec('killall -9 mpv');
    }


    pause() {
        this.sendKey(keys.pause);
    }

    stop() {
        this.sendKey(keys.stop);
    }

    seekBackward() {
        this.sendKey(keys.seekBackward);
    }

    seekForward() {
        this.sendKey(keys.seekForward);
    }

    bigSeekBackward() {
        this.sendKey(keys.bigSeekBackward);
    }

    bigSeekForward() {
        this.sendKey(keys.bigSeekForward);
    }

    displayStatus() {
        this.sendKey(keys.status);
    }
}

module.exports = mpv;

