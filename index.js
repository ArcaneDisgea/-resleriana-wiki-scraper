const puppeteer = require("puppeteer");
const fs = require('fs');
const client = require('https');
const cliProgress = require('cli-progress');

function downloadImage(url, filepath) {
	return new Promise((resolve, reject) => {
		client.get(url, (res) => {
			if (res.statusCode === 200) {
				res.pipe(fs.createWriteStream(filepath))
					.on('error', reject)
					.once('close', () => resolve(filepath));
			} else {
				// Consume response data to free up memory
				res.resume();
				reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));

			}
		});
	});
}

async function main() {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	await page.goto("https://atelier.wiki.gg/wiki/Memoria_List", { waitUntil: 'networkidle2' });
	const rows = await page.evaluate(() => {
		const memoriaNames = [...document.querySelectorAll(".wikitable > tbody > tr > td:nth-child(3)")].map(el => el.textContent)
		const memoriaImageUrlPage = [...document.querySelectorAll(".wikitable > tbody > tr > td:nth-child(1) > center > a")].map(el => "https://atelier.wiki.gg" + el.getAttribute('href'))
		let results = [];

		for (let i = 0; i < memoriaNames.length; i++) {
			let memoria = {
				name: memoriaNames[i],
				url: memoriaImageUrlPage[i]
			}
			results.push(memoria)
		}

		return results;
	})
	let finalResults = [];
	const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
	bar.start(rows.length, 0)
	let barPosition = 0;
	for (const result of rows) {
		barPosition++
		bar.update(barPosition)
		await page.goto(result.url, { waitUntil: 'networkidle2' });
		memoriaImageUrl = await page.evaluate(() => {
			return "https://atelier.wiki.gg" + document.querySelector(".fullMedia > p > a").getAttribute("href")
		})
		let memoria = {
			name: result.name,
			url: memoriaImageUrl
		}
		finalResults.push(memoria)
	}

	bar.stop();
	browser.close();

	const downloadBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
	downloadBar.start(rows.length, 0)
	barPosition = 0;
	for (const memoria of finalResults) {
		barPosition++
		downloadBar.update(barPosition)
		downloadImage(memoria.url, "./out/" + memoria.name + ".png")
			.then(console.log)
			.catch(console.error);
	}
	downloadBar.stop()
}

main()