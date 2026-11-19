//Global state and URL query parameters
let sessionID,canBeSkipped;
let params = new URLSearchParams(location.search);
let treasureHuntID = params.get("uuid");
let appName = params.get("app");
let playerName;
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
                    location.href="leaderboard.html";
                    return;
                }
                canBeSkipped = questionData.canBeSkipped;
                document.getElementById("q").innerHTML = questionData.questionText;
            }
            else {
                //Saved session is invalid or expired
                console.error("Failed to fetch question:" + questionData.errorMessages);
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
                        location.href="leaderboard.html";
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
                    location.href="leaderboard.html";
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
                    location.href="leaderboard.html";
                    return;
                }
                resultMsg.textContent="Error: "+errorText;
            }
        })
        .catch(error => console.error("An error occurred during execution:", error));
}
//Calls /leaderboard to fetch and display the leaderboard and then the /score to fetch and display the player with his score
function displayLeaderboard(){
    //Fall back to the cookie because leaderboard.html loads in a fresh page where sessionID starts undefined
    const activeSession= sessionID || getCookie("sessionID");
    if(!activeSession){
        console.error("No sessionID found for leaderboard.");
        alert("No active session found");
        return;
    }
    //encodeURIComponent safely escapes characters in the session token
    const leaderboardURL=`https://codecyprus.org/th/api/leaderboard?session=${encodeURIComponent(activeSession)}&sorted&limit=10`;
    const scoreURL=`https://codecyprus.org/th/api/score?session=${encodeURIComponent(activeSession)}`;
    //Fetch and render the leaderboard table
    fetch(leaderboardURL)
        .then(response => {
            if (!response.ok)
                throw new Error("Leaderboard API error: " + response.statusText);
            return response.json();
        })
        .then(leaderboardData => {
            if(leaderboardData.status === "OK"){
                document.getElementById("leaderboardHeader").innerText=leaderboardData.treasureHuntName;
                document.getElementById("leaderboard").style.display="block";
                const users=leaderboardData.leaderboard;
                const tableHeader=document.getElementById("usersTableHeader");
                const tableBody = document.getElementById("usersTableBody");
                //Clear old rows
                tableHeader.innerHTML="";
                tableBody.innerHTML="";
                const headerRow=document.createElement("tr");
                const columnInputs=["Name","Score","Completion Date"];
                columnInputs.forEach(headData=>{
                    const header=document.createElement("th");
                    header.innerText=headData;
                    headerRow.appendChild(header);
                });
                tableHeader.appendChild(headerRow);
                users.forEach(user => {
                    const row = document.createElement("tr");
                    const formattedTime=new Date(user.completionTime).toLocaleDateString();
                    const values =[user.player,user.score,formattedTime];
                    values.forEach(text => {
                        const cell=document.createElement("td");
                        cell.textContent=text;
                        row.appendChild(cell);
                    });
                    tableBody.appendChild(row);
                });
            }
            else{
                console.error("Failed to fetch the leaderboard table");
                alert("Failed to fetch the leaderboard table"+leaderboardData.errorMessages);
            }
        })
        .catch(error => console.error("An error occurred during execution:"+error));
    //Fetch and render the current player's score below the leaderboard
    fetch(scoreURL)
        .then(response => {
            if (!response.ok)
                throw new Error("Score API error: " + response.statusText);
            return response.json();
        })
        .then(scoreData => {
            if(scoreData.status === "OK"){
                const scoreEl=document.getElementById("playerScore");
                const playerEl = document.getElementById("scorePlayerName");
                if(scoreEl)
                    scoreEl.textContent = scoreData.score;
                if(playerEl&&scoreData.player)
                    playerEl.textContent=scoreData.player;
            }
            else
                console.error("Failed to fetch player score"+scoreData.errorMessages);
        })
        .catch(error=>console.error("An error occurred during execution:", error));
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
//Deletes the cookies and redirects the player to the main page
function refreshGame() {
    deleteCookie("playerName");
    deleteCookie("sessionID");
    deleteCookie("treasureHuntID");
    const url=new URL("index.html",location.href);
    location.href=url.toString();
}
document.addEventListener("DOMContentLoaded", () => {
    //Only run the game starter on pages that have the game UI
    if(document.getElementById("playerNameEntry") && document.getElementById("answerContainer")){
        startGame();
    }
});