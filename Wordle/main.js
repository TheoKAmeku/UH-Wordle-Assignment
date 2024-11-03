function showRules() {
    console.log("Rules")
    console.log("The aim of the game is to guess a secret word within 6 guesses. There are 5 letters in the word")
    console.log("If the colour of the letter is green, it means the letter is in the correct place")
    console.log("If the colour of the letter is yellow-orange, it means the letter exists in the secret word but not the correct place")
    console.log("Otherwise the letter does not exist in the word")
}

function getNewWord() { 
    const wordList = [ 
        "blade", "knife", "risen", "spoon", "table",
        "weird", "input", "index", "prize", "mouse",
        "drink", "train", "space", "glide", "glory",
        "crest", "fight", "zebra", "spark", "slide"
    ]
    // generates a random index and selects the index from the wordlist and generates it for the user to guess.
    const randomIndex = Math.floor(Math.random() * wordList.length)
    return wordList[randomIndex]
}

function validateUserInput(input) {
    input = input.toUpperCase()
    
    if (input.length === 1) {
        if (!/[A-Z]/.test(input)) {
            return null
        }
    }
    else {
        const specialInputs = new Set(["ENTER", "BACKSPACE", "DELETE"])

        if (!specialInputs.has(input)) {
            return null
        }
    }

    return input
}

async function callAPI(url) {
    try {
        const response = await fetch(url)

        if (!response.ok) {
            return null
        }

        return await response.json()
    }
    catch (error) {
        if (error.message === "Failed to fetch") {
            return "internet error"
        }
        return "internal error"
    }
}

async function validateGuess(userGuess) {
    if (userGuess.length !== 5) {
        return [false, "Word must have 5 letters", "invalid guess"]
    }

    let count = 0
    let definitionData;
    while (count < 3) {
        definitionData = await callAPI(`https://api.dictionaryapi.dev/api/v2/entries/en/${userGuess}`)

        if (!(new Set([null, "internet error", "internal error"]).has(definitionData))) {
            return [true, null, "submitting guess"]
        }

        count++
    }
    
    if (definitionData === null) {
        return [false, "Your input is not an actual word", "invalid guess"]
    }
    if (definitionData === "internet error") {
        return [false, "Please connect to the internet", "internal error"]
    }
    if (definitionData === "internal error") {
        return [false, "There has been an error, please try again", "internal error"]
    }
    
    
    return [true, null, "submitting guess"]
}

function findColours(secretWord, currentGuess, colourTypes) {
    const colours = []

    for (let i = 0; i < secretWord.length; i++) {
        const currentChar = currentGuess[i]
        const charValidation = { exists: false, correct: false }

        // Find what type of colour the character is
        if (currentChar === secretWord[i]) {
            // Same character in same place
            charValidation.correct = true
        }
        else {
            const doesCharExist = secretWord.split("").some((wordChar) => currentChar === wordChar)

            if (doesCharExist) {
                // Same character different place
                charValidation.exists = true
            }
        }

        // Correspond character to colour
        if (charValidation.exists) {
            colours.push(colourTypes.exists)
        }
        else if (charValidation.correct) {
            colours.push(colourTypes.correct)
        }
        else {
            colours.push(colourTypes.none)
        }
    }

    return colours
}

async function handleGuess(secretWord, currentGuess, allUserGuesses, colourTypes) {
    const [valid, userErrorMessage, gameState] = await validateGuess(currentGuess)
    console.clear()

    if (!valid) {
        return [gameState, currentGuess, allUserGuesses, userErrorMessage]
    }

    // Adding valid word to the list
    const guessColours = findColours(secretWord, currentGuess, colourTypes)
    allUserGuesses.push({ word: currentGuess, colours: guessColours })

    return [gameState, "", allUserGuesses, userErrorMessage]
}

function hasPlayerWon(colours, correctColour) {
    return !(colours.some((colour) => colour !== correctColour))
}

function hasGameFinished(hasWon, allUserGuesses) {
    return hasWon || allUserGuesses.length > 5
}

function removeLetter(currentGuess) {
    return (currentGuess.length > 0) ? currentGuess.substring(0, currentGuess.length - 1) : currentGuess
}

function addLetter(currentGuess, character) {
    return (currentGuess.length < 5) ? currentGuess + character : currentGuess
}

function showFrame(gameState, row, col, letter, colours, secretWord, userErrorMessage) {
    const showWinResults = () => alert("You Win!")
    const showLoseResults = (secretWord) => alert(`You Lose! The word was ${secretWord}`)
    const showError = (reason) => alert(reason)
    const showLetterChange = (row, col, letter) => {
        const letterContainer = document.getElementById(`letter${row}${col}`);
        letterContainer.innerHTML = letter
    }
    const showGuessColours = (row, colours) => {
        for (let col = 0; col < 5 ; col++) {
            const letterContainer = document.getElementById(`letter${row}${col}`);
            letterContainer.classList.add(colours[col])
        }
    }

    // All possible gameStates
    switch (gameState) {
        case "added letter":
            showLetterChange(row, col, letter)
            break

        case "removed letter":
            showLetterChange(row, col + 1, "")
            break

        case "submitting guess":
            showGuessColours(row - 1, colours)
            break

        case "player has won":
            showGuessColours(row - 1, colours)
            setTimeout(() => {
                showWinResults(secretWord)
            }, 500)
            break
        
        case "player has lost":
            showGuessColours(row - 1, colours)
            setTimeout(() => {
                showLoseResults(secretWord)
            }, 500)
            break        

        case "invalid guess":
            showError(userErrorMessage)
            break
            
        case "internal error":
            showError(userErrorMessage)
            break
    }
}

async function handleFrame(isPlaying, secretWord, currentGuess, allUserGuesses, input, colourTypes) {
    const userInput = validateUserInput(input)
    if (userInput === null) {
        return [isPlaying, currentGuess, allUserGuesses]
    }

    let userErrorMessage, gameState = null

    if (userInput === 'ENTER') {
        [gameState, currentGuess, allUserGuesses, userErrorMessage] = await handleGuess(secretWord, currentGuess, allUserGuesses, colourTypes)
        
        if (userErrorMessage === null) {
            const hasWon = hasPlayerWon(allUserGuesses[allUserGuesses.length - 1].colours, colourTypes.correct)
            isPlaying = !hasGameFinished(hasWon, allUserGuesses)

            if (!isPlaying) {
                if (hasWon) {
                    gameState = "player has won"
                }
                else {
                    gameState = "player has lost"
                }
            }
        }
    }
    else {
        const tempGuess = currentGuess
        let action = ""

        if (userInput === 'BACKSPACE' || userInput === 'DELETE') {
            action = "removed"
            currentGuess = removeLetter(currentGuess, secretWord)
        }
        else {
            action = "added"
            currentGuess = addLetter(currentGuess, userInput)
        }

        if (currentGuess !== tempGuess) {
            gameState = `${action} letter`
        }
    }

    const colours = (allUserGuesses.length > 0) ? allUserGuesses[allUserGuesses.length - 1].colours : null
    showFrame(gameState, allUserGuesses.length, currentGuess.length - 1, userInput, colours, secretWord, userErrorMessage)
    
    return [isPlaying, currentGuess, allUserGuesses]
}

function restartGame() {
    const secretWord = getNewWord()
    const colourTypes = { correct: 'right', exists: "wrong", none: "empty" }

    let currentGuess = ""
    let allUserGuesses = []
    let isPlaying = true
    let processingFrame = false

    showRules()
    console.log("New game started! Good luck!")

    // Read user inputs
    document.addEventListener("keydown", async (event) => { 
        if (isPlaying && !processingFrame) {
            processingFrame = true;
            [isPlaying, currentGuess, allUserGuesses] = await handleFrame(isPlaying, secretWord.toUpperCase(), currentGuess, allUserGuesses, event.key, colourTypes)
            processingFrame = false;
        }
    })
}

// Add an event listener to the button to restart the game
document.getElementById("restartButton").addEventListener("click", () => {
    restartGame();
});

function setupGame() {
    const container = document.createElement("div")
    const grid = document.createElement("div")

    container.id = "container"
    grid.className = "grid"

    for (let row = 0 ; row < 6; row++) {
        for (let col = 0 ; col < 5; col++) {
            const letter = document.createElement("div")
            letter.className = "gamezone"
            letter.id = `letter${row}${col}`
            letter.innerHTML = ""

            grid.appendChild(letter)
        }
    }

    container.appendChild(grid)
    document.body.appendChild(container)
}

function playGame() {
    showRules()
    setupGame()
    restartGame() // Initialize by starting the game
}

playGame()
