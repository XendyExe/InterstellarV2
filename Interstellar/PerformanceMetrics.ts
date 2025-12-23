export function stellarFormatLoadTimes(ms: number): string {
    if (ms >= 1000) {
        const seconds = ms / 1000;
        return `${seconds.toFixed(2)} s`;
    } else if (ms >= 1) {
        return `${ms.toFixed(2)} ms`;
    } 
    else if (ms >= 0.001) {
        const micro = ms * 1000;
        return `${micro.toFixed(2)} µs`;
    } else {
        const ns = ms * 1_000_000;
        return `${ns.toFixed(2)} ns`;
    }
}

class PerformanceMetrics {
    startTime: number = 0;
    splitTime: number = 0;
    text: string[] = [];
    split(name: string) {
        let time = performance.now();
        let split = time - this.splitTime;
        this.splitTime = time;
        this.text.push(`${name}: +${stellarFormatLoadTimes(split)} (${stellarFormatLoadTimes(time - this.startTime)})`)
    }
    start(name: string) {
        this.splitTime = this.startTime = performance.now();
        this.text.push(`${name}`)
    }
    end() {
        let time = performance.now();
        this.text.push(`Completed in: ${stellarFormatLoadTimes(time - this.startTime)}`);
    }
    pushBlankLine() {
        this.text.push("");
    }
    push(text: string) {
        this.text.push(text);
    }
}

export default new PerformanceMetrics();