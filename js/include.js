function includeHTML(file, elementId, callback) {
  fetch(file)
    .then(response => response.text())
    .then(data => {
      document.getElementById(elementId).innerHTML = data;
      if (callback) callback();
    })
    .catch(err => console.error("Include failed:", err));
}
