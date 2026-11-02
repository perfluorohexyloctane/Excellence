// the URL base we're fetching from
const API_URL = "https://codecyprus.org/th/api/list";

function getChallenges() {
    fetch(API_URL)
        // decode the JSON into an object
        .then(res => res.json())
        .then(thcResponse  => {
            // check for errors reported by the server
            if (thcResponse.status !== "OK") {
                // alert the user
                alert(thcResponse.errorMessages.join("\n"));
                return;
            }
            // define the treasure hunts we got from the API
            let hunts = thcResponse.treasureHunts;
            let list = document.getElementById("challenges")

            // iterate through every object in the JSON (if there are multiple treasure hunts)
            for (let i = 0; i < hunts.length; i++) {
                // create list item in challenges.html
                let item = document.createElement("li");
                // construct the url with the attributes
                item.innerHTML = "<a href='start.html?uuid=" + hunts[i].uuid + "&player=Excellence&app=ExcellenceApp'>" + hunts[i].name + "</a>";
                list.appendChild(item);
            }
        })
        // catch any hangs
        .catch(err => {
            alert("Could not reach the server: " + err);
        })
}

getChallenges();