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
    catch {
        return null
    }
}

async function validateGuess(userGuess) {
    if (userGuess.length !== 5) {
        return [false, "Word must have 5 letters", "invalid guess"]
    }

    const definitionData = await callAPI(`https://api.dictionaryapi.dev/api/v2/entries/en/${userGuess}`)
    if (definitionData === null) {
        return [false, "Your input is not an actual word", "invalid guess"]
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

function showFrame(gameState, secretWord, currentGuess, allUserGuesses, isPlaying, hasWon, userErrorMessage) {
    function showResults(hasWon, word) {
        if (hasWon) {
            console.log("You Win")
        }
        else {
            console.log(`You Lose, the word was ${word}`)
        }
    }
    function showError(reason) {
        console.log(reason)
    }

    if (!isPlaying) {
        // Game has ended
        showResults(hasWon, secretWord)
    }
    else {
        if (userErrorMessage) {
            // Error or user has invalid input
            showError(userErrorMessage)
        }
    }
    
    console.log(`Current Guess: ${currentGuess}, isPlaying: ${isPlaying}, gameState: ${gameState}`)
    console.log("All Guesses:", allUserGuesses)
    console.log("")
}

async function handleFrame(isPlaying, secretWord, currentGuess, allUserGuesses, input, colourTypes) {
    const userInput = validateUserInput(input)
    if (userInput === null) {
        return [isPlaying, currentGuess, allUserGuesses]
    }

    // Backend
    // Possible gameStates: "added letter", "removed letter", "submitting guess", "invalid guess", "player has lost", "player has won"
    let hasWon, userErrorMessage, gameState = null

    if (userInput === 'ENTER') {
        [gameState, currentGuess, allUserGuesses, userErrorMessage] = await handleGuess(secretWord, currentGuess, allUserGuesses, colourTypes)
        
        if (userErrorMessage === null) {
            hasWon = hasPlayerWon(allUserGuesses[allUserGuesses.length - 1].colours, colourTypes.correct)
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
    else if (userInput === 'BACKSPACE' || userInput === 'DELETE') {
        currentGuess = removeLetter(currentGuess, secretWord)
        gameState = "removed letter"
    }
    else {
        currentGuess = addLetter(currentGuess, userInput)
        gameState = "added letter"
    }

    // Frontend
    showFrame(gameState, secretWord, currentGuess, allUserGuesses, isPlaying, hasWon, userErrorMessage)
    
    return [isPlaying, currentGuess, allUserGuesses]
}

function playGame() {
    showRules()

    const secretWord = getNewWord()
    const colourTypes = { correct: "#538d4e", exists: "#b59f3b", none: "#8a8a94" }
    
    let currentGuess = ""
    let allUserGuesses = []
    let isPlaying = true
    let processingFrame = false

    document.addEventListener("keydown", async (event) => { // Read user inputs
        if (isPlaying && !processingFrame) {
            processingFrame = true;
            [isPlaying, currentGuess, allUserGuesses] = await handleFrame(isPlaying, secretWord.toUpperCase(), currentGuess, allUserGuesses, event.key, colourTypes)
            processingFrame = false;
        }
    })
}

playGame()
