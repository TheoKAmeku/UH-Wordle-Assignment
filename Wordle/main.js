/**
 * Brings the rules popup
 * @param {Boolean} hasReadRules Boolean on whether to prevent or allow the popup showing (based on first visit)
 */
function showRules(hasReadRules) {
    if (!hasReadRules) {
        const rules = document.getElementById("rulesOverlay")
        rules.style.display = "block"
    }
}
/**
 * Creates divs for the wordle game for UI
 */
function setupGame() {
    const container = document.createElement("div")
    const grid = document.createElement("div")

    container.id = "container"
    grid.className = "grid"

    for (let row = 0 ; row < 6; row++) { // Amount of guesses
        for (let col = 0 ; col < 5; col++) { // Amount of letter per guess
            const letter = document.createElement("div")
            letter.className = "gamezone"
            letter.id = `letter${row}${col}`
            letter.innerHTML = ""

            grid.appendChild(letter)
        }
    }

    container.appendChild(grid)
    document.body.appendChild(container) // Adds to html
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

/**
 * Validates user input allowing inputs to add, remove and submit
 * @param {String} input Keydown event input
 * @returns {String} Accepted input
 * @returns {Null} Invalid input
 */
function validateUserInput(input) {
    input = input.toUpperCase()
    
    if (input.length === 1) {
        if (!/[A-Z]/.test(input)) {
            // Single character not from the alphabet (e.g. ! would get here)
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
/**
 * Attempts to grab data from an API
 * @param {String} url A hyperlink to desired API
 * @returns {Object} Desired api result
 * @returns {String} Error Type
 * @returns {Null} API has responded negatively
 */
async function callAPI(url) {
    try {
        const response = await fetch(url) // Attempt to call API

        if (!response.ok) {
            return null // Api has bad response
        }

        return await response.json()
    }
    catch (error) {
        if (error.message === "Failed to fetch") {
            return "internet error" // User is not connected to internet
        }
        return "internal error" // Different type of error
    }
}
/**
 * Finds if user guess is valid
 * @param {String} userGuess Current guess the user has inputted
 * @returns {Tuple} [isPlaying, errorMessage, gameState] 
 */
async function validateGuess(userGuess) {
    if (userGuess.length !== 5) {
        return [false, "Word must have 5 letters", "invalid guess"]
    }

    let count = 0 // Limiting amount of calls
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

/**
 * Determines the colour per letter to serve as a hint to the secret word
 * @param {String} secretWord The word that the user is attempting to guess 
 * @param {String} currentGuess Most attempt the user has made based on secret word
 * @param {Object} colourTypes Types of colours that indicate certain hints
 * @returns {Array} Colour per letter in current guess
 */
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

/**
 * Attempts to add the current guess to the list of guesses
 * @param {String} secretWord The word that the user is attempting to guess 
 * @param {String} currentGuess Most attempt the user has made based on secret word
 * @param {Array} allUserGuesses All attempts user has made based on the secret word
 * @param {Object} colourTypes Types of colours that indicate certain hints
 * @returns {Tuple} [gameState, currentGuess, allUserGuesses, errorMessage]
 */
async function handleGuess(secretWord, currentGuess, allUserGuesses, colourTypes) {
    const [valid, errorMessage, gameState] = await validateGuess(currentGuess)
    console.clear()

    if (!valid) {
        return [gameState, currentGuess, allUserGuesses, errorMessage]
    }

    // Adding valid word to the list of valid guesses
    const guessColours = findColours(secretWord, currentGuess, colourTypes)
    allUserGuesses.push({ word: currentGuess, colours: guessColours })

    return [gameState, "", allUserGuesses, errorMessage]
}

/**
 * Finds out if the player has won if all colours are the correct colour
 * @param {Array} colours All colours of the current guess
 * @param {String} correctColour The colour that guarantees same letter same position
 * @returns {Boolean} If the player has won or not
 */
function hasPlayerWon(colours, correctColour) {
    return !(colours.some((colour) => colour !== correctColour))
}

/**
 * Determines on whether wordle has finished
 * @param {Boolean} hasWon Value representing if the player has won
 * @param {Array} allUserGuesses All attempts user has made based on the secret word
 * @returns {Boolean} If the current game has finished
 */
function hasGameFinished(hasWon, allUserGuesses) {
    return hasWon || allUserGuesses.length > 5
}

/**
 * Attempts to remove a letter from the current guess
 * @param {String} currentGuess Most attempt the user has made based on secret word
 * @returns {String} New current guess
 */
function removeLetter(currentGuess) {
    return (currentGuess.length > 0) ? currentGuess.substring(0, currentGuess.length - 1) : currentGuess
}

/**
 * Attempts to add a letter to the current guess
 * @param {String} currentGuess Most attempt the user has made based on secret word
 * @param {String} character A single character
 * @returns New current guess
 */
function addLetter(currentGuess, character) {
    return (currentGuess.length < 5) ? currentGuess + character : currentGuess
}

/**
 * Uses the UI to present to the user how the game is functioning
 * @param {String} gameState Value describing what action the game has done
 * @param {Integer} row The users current guess number 
 * @param {Integer} col The users current letter number 
 * @param {String} letter The users changed letter or value
 * @param {Array} colours All colours of the current guess
 * @param {String} secretWord The word that the user is attempting to guess 
 * @param {String} errorMessage Potential error message if an internal error or the user has made a mistkae
 */
function showFrame(gameState, row, col, letter, colours, secretWord, errorMessage) {
    /**
     * An alert to let the user know that they have won
     */
    const showWinResults = () => alert("You Win!")
    const duration = 400;

    /**
     * An alert to let the user know that they have lost
     * @param {String} secretWord The word that the user is attempting to guess 
     */
    const showLoseResults = (secretWord) => alert(`You Lose! The word was ${secretWord}`)

    /**
     * Allows the user to see errors
     * @param {String} reason Error message
     */
    const showError = (reason) => alert(reason)

    /**
     * Allows the user to see the letter they have added/removed
     * @param {Integer} row The users current guess number 
     * @param {Integer} col The users current letter number 
     * @param {String} letter The users changed letter or value
     */
    const showLetterChange = (row, col, letter) => {
        const letterContainer = document.getElementById(`letter${row}${col}`);
        letterContainer.innerHTML = letter
    }

    /**
     * Shows the current guess colours to the user
     * @param {Integer} row The users current guess number 
     * @param {Array} colours All colours of the current guess
     */
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
            showError(errorMessage)
            break
            
        case "internal error":
            showError(errorMessage)
            break
    }
}

/**
 * Runs a frame of wordle
 * @param {Boolean} isPlaying Value determining if the current game is still playing
 * @param {String} secretWord The word that the user is attempting to guess 
 * @param {String} currentGuess Most attempt the user has made based on secret word
 * @param {Array} allUserGuesses All attempts user has made based on the secret word
 * @param {String} input Keydown Event for an user input
 * @param {Object} colourTypes Types of colours that indicate certain hints
 * @returns {Tuple} [isPlaying, currentGuess, allUserGuesses]
 */
async function handleFrame(isPlaying, secretWord, currentGuess, allUserGuesses, input, colourTypes) {
    const userInput = validateUserInput(input)
    if (userInput === null) {
        return [isPlaying, currentGuess, allUserGuesses]
    }

    let errorMessage, gameState = null

    if (userInput === 'ENTER') {
        // Attempt at guessing word
        [gameState, currentGuess, allUserGuesses, errorMessage] = await handleGuess(secretWord, currentGuess, allUserGuesses, colourTypes)
        
        if (errorMessage === null) {
            // Valid guess has been made
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
        // Adding/Removing a letter
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
    showFrame(gameState, allUserGuesses.length, currentGuess.length - 1, userInput, colours, secretWord, errorMessage)
    
    return [isPlaying, currentGuess, allUserGuesses]
}

function startGame() {
    const secretWord = getNewWord()
    const colourTypes = { correct: 'right', exists: "wrong", none: "empty" }

    let currentGuess = ""
    let allUserGuesses = []
    let isPlaying = true
    let processingFrame = false

    // Read user inputs
    document.addEventListener("keydown", async (event) => { 
        if (isPlaying && !processingFrame) {
            processingFrame = true;
            [isPlaying, currentGuess, allUserGuesses] = await handleFrame(isPlaying, secretWord.toUpperCase(), currentGuess, allUserGuesses, event.key, colourTypes)
            processingFrame = false;
        }
    })
}

/**
 * Setup buttons for rules and restarting, allows wordle to start
 */
function main() {
    showRules(localStorage.getItem("hasReadRules"))
    localStorage.setItem("hasReadRules", true)
    
    setupGame()
    startGame() // Initialize by starting wordle

    // Add an event listener to the button to restart wordle
    document.getElementById("restartButton").addEventListener("click", () => {
        window.location.reload();
    });
    document.getElementById("openRulesButton").addEventListener("click", () => {
        document.getElementById("rulesOverlay").style.display = "block"
    });
    document.getElementById("closeRulesButton").addEventListener("click", () => {
        document.getElementById("rulesOverlay").style.display = "none"
    });
}

main()
