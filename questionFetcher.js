function getData() {
    const dataURL = "https://codecyprus.org/th/api/list";
    let sessionID;
    // 1. Fetch available treasure hunts
    fetch(dataURL)
        .then(response => {
            if (!response.ok) {
                throw new Error("List API error: " + response.statusText);
            }
            return response.json();
        })
        .then(listData => {
            // Access the first treasure hunt inside the treasureHunts array
            let treasureHuntID = listData.treasureHunts[0].uuid;
            let appName = listData.treasureHunts[0].name;
            let playerName = "AndrewK_" + Date.now();
            // 2. Start game session
            let startingURL = `https://codecyprus.org/th/api/start?player=${playerName}&app=${appName}&treasure-hunt-id=${treasureHuntID}`;

            // Return the fetch promise to chain it to the next .then()
            return fetch(startingURL);
        })
        .then(response2 => {
            if (!response2.ok) {
                throw new Error("Start API error: " + response2.statusText);
            }
            return response2.json();
        })
        .then(listData2 => {
            if (listData2.status === "OK") {
                sessionID = listData2.session;
                console.log("Session created successfully:", sessionID);
                let questionURL = `https://codecyprus.org/th/api/question?session=${sessionID}`;
                return fetch(questionURL);
            }
            else{
                console.error("Failed to start session:", listData2.errorMessages);
                throw new Error("Failed to start session");
            }
        })
        .then(response3 => {
            if (!response3.ok) {
                throw new Error("Question API error: " + response3.statusText);
            }
            return response3.json();
        })
        .then(listData3 => {
            if(listData3.status === "OK") {
                console.log("Questions fetched successfully:");
                console.log(listData3.questionText);
                let answer = 42;
                let answerURL = `https://codecyprus.org/th/api/answer?session=${sessionID}&answer=${answer}`;
                return fetch(answerURL);
            }
            else{
                console.error("Failed to fetch question:", listData3.errorMessages);
            }
        })
        .then(response4 => {
            if (!response4.ok) {
                throw new Error("Answer API error: " + response4.statusText);
            }
            return response4.json();
        })
        .then(listData4 => {
            if (listData4.status === "OK") {
                console.log("Answer fetched successfully:");
                let correctAnswer = listData4.correct;
                let message=listData4.message;
                console.log(message+correctAnswer);
            }
        })
        .catch(error => {
            console.error("An error occurred during execution:", error);
        });
}

// Run application
getData();