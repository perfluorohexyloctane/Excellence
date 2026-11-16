//Global state and URL query parameters
let sessionID,canBeSkipped;
let params = new URLSearchParams(location.search);
let treasureHuntID = params.get("uuid");
let appName = params.get("app");
let playerName;
//Clears active session cookies and navigates to the leaderboard.html once the treasure hunt is completed or run out of time
function endSessionAndRedirect() {
    deleteCookie("playerName");
    deleteCookie("sessionID");
    deleteCookie("treasureHuntID");
    location.href="leaderboard.html";
}
//retrieves the current question and redirects to leadboard.html once the hunt is marked completed
function fetchQuestion() {
    const questionURL = `https://codecyprus.org/th/api/question?session=${encodeURIComponent(sessionID)}`;
    fetch(questionURL)
        .then(response => {
            if (!response.ok)
                throw new Error("Question API error: " + response.statusText);
            return response.json();
        })
        .then(questionData => {
            if(questionData.status === "OK") {
                if (questionData.completed){
                    endSessionAndRedirect();
                    return;
                }
                canBeSkipped = questionData.canBeSkipped;
                document.getElementById("q").innerHTML = questionData.questionText;
            }
            else {
                //Saved session is invalid or expired
                console.error("Failed to fetch question:" + questionData.errorMessages);
                deleteCookie("playerName");
                deleteCookie("sessionID");
                alert("Session invalid or expired. Please start a new game.");
                location.reload();
            }
        })
        .catch(error => console.error("An error occurred during execution:", error));
}
//Submits user's answer to /answer or calls /skip if the input is blank or question allows skipping
function submitUserAnswer() {
    const answer = document.getElementById("userAnswer").value.trim();
    const resultMsg=document.getElementById("resultMessage");
    //empty input triggers a skip request instead of an answer submission
    if(!answer){
        if(!canBeSkipped) {
            alert("This question cannot be skipped.");
            return;
        }
        const skipURL = `https://codecyprus.org/th/api/skip?session=${encodeURIComponent(sessionID)}`;
        fetch(skipURL)
            .then(response=>{
                if (!response.ok)
                    throw new Error("Skip API error: " + response.statusText);
                return response.json();
            })
            .then(skipData => {
                if(skipData.status === "OK"){
                    resultMsg.textContent=skipData.message;
                    document.getElementById("userAnswer").value="";
                    fetchQuestion();
                }
                else{
                    console.error("Failed to skip"+skipData.errorMessages);
                    const errorText=skipData.errorMessages.join(", ");
                    //Handle hunt timer expiring while the user was viewing the question
                    if(errorText.includes("Finished session") || errorText.includes("run out of time")){
                        alert("Session invalid or expired.");
                        endSessionAndRedirect();
                        return;
                    }
                    resultMsg.textContent="Error: "+errorText;
                }
            })
            .catch(error => console.error("An error occurred during execution:", error));
        return;
    }
    const answerURL = `https://codecyprus.org/th/api/answer?session=${encodeURIComponent(sessionID)}&answer=${encodeURIComponent(answer)}`;
    fetch(answerURL)
        .then(response => {
            if (!response.ok)
                throw new Error("Answer API error: " + response.statusText);
            return response.json();
        })
        .then(answerData => {
            if (answerData.status === "OK") {
                resultMsg.textContent = answerData.message;
                if (answerData.completed) {
                    endSessionAndRedirect();
                    return;
                }
                //Only clear the input and advance if the answer was correct
                if(answerData.correct){
                    document.getElementById("userAnswer").value="";
                    fetchQuestion();
                }
            }
            else{
                console.error("Failed to fetch answer:"+answerData.errorMessages);
                const errorText=answerData.errorMessages.join(", ");
                //Handle hunt timer expiring while the user was typing an answer
                if(errorText.includes("Finished session") || errorText.includes("run out of time")){
                    alert("Session invalid or expired.");
                    endSessionAndRedirect();
                    return;
                }
                resultMsg.textContent="Error: "+errorText;
            }
        })
        .catch(error => console.error("An error occurred during execution:", error));
}
//Validates the player input, switches to the question view, and initiates a new API session
function getPlayerNameEntry() {
    let value = document.getElementById("playerName").value.trim();
    if(value===""){
        alert("Please enter a player name first.");
        return;
    }
    document.getElementById("playerNameEntry").style.display="none";
    document.getElementById("answerContainer").style.display="block";
    createNewSession(value);
}
//Calls /start to register a new player session and persists session details in cookies
function createNewSession(playerName) {
    const startingURL = `https://codecyprus.org/th/api/start?player=${encodeURIComponent(playerName)}&app=${encodeURIComponent(appName)}&treasure-hunt-id=${encodeURIComponent(treasureHuntID)}`;
    fetch(startingURL)
        .then(response => {
            if (!response.ok)
                throw new Error("Start API error: " + response.statusText);
            return response.json();
        })
        .then(startData => {
            if (startData.status === "OK") {
                sessionID = startData.session; //session token
                setCookie("playerName",playerName,365);
                setCookie("sessionID",sessionID,365);
                setCookie("treasureHuntID",treasureHuntID,365);
                fetchQuestion();
            }
            else {
                //Re-show name entry if the server rejects the name
                console.error("Failed to start session:", startData.errorMessages);
                alert("Failed to start session: "+startData.errorMessages);
                document.getElementById("answerContainer").style.display="none";
                document.getElementById("playerNameEntry").style.display="block";
            }
        })
        .catch(error => console.error("An error occurred during execution:"+error));
}
//Entry point on page load: resumes an existing session if cookies match the current treasure hunt UUID, otherwise prompts for a player name.
function startGame() {
    let savedName=getCookie("playerName");
    let savedSession=getCookie("sessionID");
    let savedHuntID=getCookie("treasureHuntID");
    //verify savedHuntID matches the URL's uuid so switching hunts starts a fresh session
    if(savedName !== "" && savedSession !== "" && savedHuntID === treasureHuntID){
        document.getElementById("answerContainer").style.display = "block";
        playerName=savedName;
        sessionID=savedSession;
        fetchQuestion();
    }
    else{
        document.getElementById("playerNameEntry").style.display = "block";
    }
}
document.addEventListener("DOMContentLoaded", startGame);