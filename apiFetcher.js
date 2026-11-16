//Global variable to store session id
let sessionID,questionData,answerData,skipData;
//Extract the url query string parameters
let params = new URLSearchParams(location.search);
let treasureHuntID = params.get("uuid");
let appName = params.get("app");
//Append a timestamp to the player's name so the server doesn't get duplicate error
//Is the player name stored in the server and never cleared from the database?? TBD
let playerName= params.get("player")+Date.now();
const startingURL = `https://codecyprus.org/th/api/start?player=${playerName}&app=${appName}&treasure-hunt-id=${treasureHuntID}`;
function fetchQuestion() {
    const questionURL = `https://codecyprus.org/th/api/question?session=${sessionID}`;
    fetch(questionURL)
        .then(response => {
            if (!response.ok)
                throw new Error("Question API error: " + response.statusText);
            return response.json();
        })
        .then(listData => {
            //check if the question was retrieved
            if(listData.status === "OK") {
                //find the HTML paragraph element to display the question
                const questElement = document.getElementById("q");
                questElement.innerHTML = listData.questionText;
                questionData=listData;
                console.log("Question fetched successfully!");
            }
            else
                console.error("Failed to fetch question:", listData.errorMessages);
        })
        .catch(error => {
            console.error("An error occurred during execution:", error);
        });
}
//When the user clicks the "Submit-Answer" button its activated
function submitUserAnswer() {
    //Extracts the value in the input field
    const answer = document.getElementById("userAnswer").value.trim();
    const skipURL = `https://codecyprus.org/th/api/skip?session=${sessionID}`;
    const resultMsg=document.getElementById("resultMessage");
    if(!answer&&!questionData.canBeSkipped){
        alert("No skipping here");
        return;
    }
    if(!answer&&questionData.canBeSkipped) {
        fetch(skipURL)
            .then(response=>{
                if (!response.ok)
                    throw new Error("Skip API error: " + response.statusText);
                return response.json();
            })
        .then(listData => {
            skipData=listData;
            resultMsg.textContent=skipData.message;
            fetchQuestion();
        })
        return;
    }
    //Build the url to submit the user's answer
    let answerURL = `https://codecyprus.org/th/api/answer?session=${sessionID}&answer=${answer}`;
    //Send the answer to the API
    fetch(answerURL)
        .then(response => {
            if (!response.ok)
                throw new Error("Answer API error: " + response.statusText);
            return response.json();
        })
        //Check if the server received the answer submission
        .then(listData => {
            if (listData.status === "OK") {
                console.log("Answer fetched successfully!");
                answerData=listData;
                resultMsg.textContent = answerData.message;
                fetchQuestion();
            }
            else{
                console.log("Failed to fetch answer:", listData.errorMessages);
                resultMsg.textContent = "Error: "+listData.errorMessages;
                resultMsg.style.color = "orange";
            }
        })
        .catch(error => {
            console.error("An error occurred during execution:", error);
        });
}
//Fetch treasure hunt start API to create session
fetch(startingURL)
    .then(response => {
        //check the network response success
        if (!response.ok)
            throw new Error("Start API error: " + response.statusText);
        return response.json();
    })
    .then(listData => {
        //Check if the server created the session
        if (listData.status === "OK") {
            sessionID = listData.session; //session token
            console.log("Session created successfully:", sessionID);
            fetchQuestion();
        }
        else
            console.error("Failed to start session:", listData.errorMessages);
        })
    .catch(error => {
        console.error("An error occurred during execution:", error);
    });