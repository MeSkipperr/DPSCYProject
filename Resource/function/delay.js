function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const delayWithLoading = async (ms, message = "Waiting") => {
    const frames = ["|", "/", "-", "\\"];
    let i = 0;

    process.stdout.write(`${message} `);

    const interval = setInterval(() => {
    process.stdout.write(`\r${message} ${frames[i]}`);
    i = (i + 1) % frames.length;
    }, 250); // Animasi setiap 250ms

    await new Promise((resolve) => setTimeout(resolve, ms));

    clearInterval(interval);
    process.stdout.write(`\r${message}... Done!\n`);
};

const delayWithProgressBar = async (ms, message = "Processing") => {
    const barLength = 30; // Panjang progress bar
    const intervalTime = ms / barLength; // Waktu tiap update progress
    let progress = 0;

    process.stdout.write(`${message}: [${" ".repeat(barLength)}] 0%`);

    const interval = setInterval(() => {
    progress += 100 / barLength;
    const filledBar = "=".repeat(Math.floor(progress / (100 / barLength)));
    const emptyBar = " ".repeat(barLength - filledBar.length);
    
    process.stdout.write(`\r${message}: [${filledBar}${emptyBar}] ${Math.round(progress)}%`);
    }, intervalTime);

    await new Promise((resolve) => setTimeout(resolve, ms));

    clearInterval(interval);
    process.stdout.write(`\r${message}: [${"=".repeat(barLength)}] 100%\n`);
};

module.exports = {delay,delayWithLoading,delayWithProgressBar};