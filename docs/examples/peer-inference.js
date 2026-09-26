const params = new URLSearchParams(location.search);
const quality = params.get("quality");
document.body.dataset.quality = quality === "good" ? "good" : "bad";
document.getElementById("peer-inference-example").dataset.ready = "true";
