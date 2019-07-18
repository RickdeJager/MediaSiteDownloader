let urlRegex = /https?:\/\/[\w\d-]*\.?[\d\w-]*\.[\w]*\//
let downloadCamButton = document.getElementById('downloadCam');
let downloadSlidesButton = document.getElementById('downloadSlides');

//Usually, there are two video streams, one recording of the lecturer, and a screen capture
//The screen capture can either be video, for which this script will work fine, or it can be a series of png's with time stamps.
let stream = 0;

downloadCamButton.onclick = (function() { stream = 0; Download();})
downloadSlidesButton.onclick = (function() { stream = 1; Download();})

function Download(element) {
	console.log("Download called");
	getUrl();
}

function getUrl() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		fullUrl = tabs[0].url;
		callBack(fullUrl);
	});
}

function callBack(fullUrl) {
	var json = getData(fullUrl);
}

function getData(fullUrl) {
	var jsonUrlPart = 'Mediasite/PlayerService/PlayerService.svc/json/GetPlayerOptions';
	var jsonUrl = urlRegex.exec(fullUrl) + jsonUrlPart;
	var query = /\?catalog=[a-f0-9]*/.exec(fullUrl);
	if (query) {query = query[0];} else {query = '';}
	var data = {
		"getPlayerOptionsRequest": {
			"QueryString": query,
			"ResourceId": /Mediasite\/Play\/([a-f0-9]*)/.exec(fullUrl)[1],
			"UrlReferrer": fullUrl,
			"UseScreenReader": false,
		}
	}
	fetch(jsonUrl, {
		method : "POST",
		headers: {
			"Content-type": "application/json; charset=utf-8",
			"X-Requested-With": "XMLHttpRequest"
		},
		body: JSON.stringify(data)
	}).then(
		response => response.blob()
	).then(
	blob => blobToJson(blob)
);
}

function blobToJson(blob) {
	const reader = new FileReader();
	reader.addEventListener('loadend', (e) => {
		const text = e.srcElement.result;
		extractLink(text);
	});
	reader.readAsText(blob);
}

function extractLink(jsonString) {
	var mp4Regex = /https?:\/\/[\w\d-]*\.?([\d\w-]*\.)*[\w\d]*\/[\w\d-\/]*\.mp4/
	var ismRegex = /https?:\/\/[\w\d-]*\.?([\d\w-]*\.)*[\w\d]*\/[\w\d-\/]*\.ism/
	var json = JSON.parse(jsonString).d;
	//Get last stream
	var videoUrlID = json.Presentation.Streams[stream].VideoUrls.length - 1;
	var possibleLinks = json.Presentation.Streams[stream].VideoUrls[videoUrlID].Location;
	var links = mp4Regex.exec(possibleLinks);
	if (links) {
		downloadAsMp4(links[0]);
	} else {
		//var ismLinks = ismRegex.exec(possibleLinks);
		var ismLinks = possibleLinks;
		alert("Chuck this into youtube-dl to download: youtube-dl \""+ismLinks+"\"");
	}
}

function downloadAsMp4(link) {
	chrome.downloads.download({
		url: link,
		filename: "test.mp4"
	});
}
