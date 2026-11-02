// the URL base we're fetching from
const API_URL = "https://codecyprus.org/th/api/list";

// use fetch
fetch(API_URL)
    // parse the JSON with a promise
    .then(res => res.json())
    // once the response is received
    .then(thcResponse => {
        // check for errors in fetching
        if (thcResponse.status !== "OK") {
            // alert the user
            alert("Something went wrong!");
            return;
        }
        // fetch the unpopulated list we made in challenges.html
        let list = document.getElementById("challenges");
        // define the treasure hunts we got from the API
        let hunts = thcResponse.treasureHunts;

        // for each treasure hunt
        for (let i = 0; i < hunts.length; i++) {
            // create an item in the list
            let item = document.createElement("li");
            // construct the url with the attributes
            item.innerHTML = "<a href='start.html?uuid=" + hunts[i].uuid + "&player=Excellence&app=ExcellenceApp" + "'>" + hunts[i].name + "</a>";
            item.innerHTML = "<a href='start.html?uuid=" + hunts[i].uuid + "&player=Excellence&app=ExcellenceApp" + "'>" + hunts[i].name + "</a>";
            // add it to the list
            list.appendChild(item);
        }
    })
    // catch any hangs
    .catch(err => {
        alert("Could not reach the server: " + err);
    })