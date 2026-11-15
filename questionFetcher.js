//Global variable to store session id
let sessionID;
//Extract the url query string parameters
let params = new URLSearchParams(location.search);
let treasureHuntID = params.get("uuid");
let appName = params.get("app");
//Append a timestamp to the player's name so the server doesn't get duplicate error
//Is the player name stored in the server and never cleared from the database?? TBD
let playerName= params.get("player")+Date.now();
const startingURL = `https://codecyprus.org/th/api/start?player=${playerName}&app=${appName}&treasure-hunt-id=${treasureHuntID}`;
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
            let questionURL = `https://codecyprus.org/th/api/question?session=${sessionID}`; //Build question API url
            console.log("Session created successfully:", sessionID);
            //Fetch the first question for the mission
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
                        console.log("Question fetched successfully!");
                    }
                    else
                        console.error("Failed to fetch question:", listData.errorMessages);
                })
                .catch(error => {
                    console.error("An error occurred during execution:", error);
                });
        }
        else
            console.error("Failed to start session:", listData.errorMessages);
        })
    .catch(error => {
        console.error("An error occurred during execution:", error);
    });
//When the user clicks the "Submit-Answer" button its activated
function submitUserAnswer() {
    //Extracts the value in the input field
    let answer = document.getElementById("userAnswer").value;
    //Confirm that the input is not empty
    if(!answer.trim()){
        alert("Please enter a valid answer");
        return;
    }
    //Build the url to submit the user's answer
    let answerURL = `https://codecyprus.org/th/api/answer?session=${sessionID}&answer=${answer}`;
    //Send the answer to the API
    fetch(answerURL)
        .then(response => {
            if (!response.ok) {
                throw new Error("Answer API error: " + response.statusText);
            }
            return response.json();
        })
        //Check if the server received the answer submission
        .then(listData => {
            const resultMsg=document.getElementById("resultMessage");
            if (listData.status === "OK") {
                console.log("Answer fetched successfully!");
                //Checks if the answer submitted by the user is correct/incorrect
                if(listData.correct){
                    resultMsg.textContent = "Correct!";
                    resultMsg.style.color = "green";
                }
                else{
                    resultMsg.textContent = "Incorrect.";
                    resultMsg.style.color = "red";
                }
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