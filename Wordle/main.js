function showRules() {
    console.log("Rules")
    console.log("The aim of the game is to guess a secret word within 6 guesses. There are 5 letters in the word")
    console.log("If the colour of the letter is green, it means the letter is in the correct place")
    console.log("If the colour of the letter is yellow-orange, it means the letter exists in the secret word but not the correct place")
    console.log("Otherwise the letter does not exist in the word")
}

function getNewWord() {
    const wordList = [
        "apple", "grape", "pearl", "brick", "table",
        "plant", "stone", "flame", "smoke", "crate",
        "drink", "sugar", "space", "shine", "glory",
        "liver", "crisp", "phone", "spark", "slice"
    ]

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

function validateGuess(userWord) {
    if (userWord.length !== 5) {
        return [false, "Word must have 5 letters"]
    }

    // Word confirmation

    return [true, null]
}

function findColours(word, guess, colourTypes) {
    const colours = []

    for (let i = 0; i < word.length; i++) {
        const currentChar = guess[i]
        const charValidation = { exists: false, correct: false }

        // Find what type of colour the character is
        if (currentChar === word[i]) {
            // Same character in same place
            charValidation.correct = true
        }
        else {
            const doesCharExist = word.split("").some((wordChar) => currentChar === wordChar)

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

function handleGuess(word, guess, allUserGuesses, colourTypes) {
    const [valid, userErrorMessage] = validateGuess(guess)

    if (!valid) {
        return [guess, allUserGuesses, userErrorMessage]
    }

    // Adding valid word to the list
    const guessColours = findColours(word, guess, colourTypes)
    allUserGuesses.push({ word: guess, colours: guessColours })
    guess = ""

    return [guess, allUserGuesses, userErrorMessage]
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

function showFrame(word, guess, allUserGuesses, isPlaying, hasWon, userErrorMessage) {
    const showResults = (hasWon, word) => {
        if (hasWon) {
            console.log("You Win")
        }
        else {
            console.log(`You Lose, the word was ${word}`)
        }
    }
    const showError = (reason) => {
        console.log(reason)
    }

    if (!isPlaying) {
        // Game has ended
        showResults(hasWon, word)
    }
    else {
        if (userErrorMessage) {
            // Error or user has invalid input
            showError(userErrorMessage)
        }
    }
    
    console.log(`Current Guess: ${guess}, isPlaying: ${isPlaying}, hasWon: ${hasWon || false}`)
    console.log("All Guesses:", allUserGuesses)
    console.log("")
}

function handleFrame(isPlaying, word, guess, allUserGuesses, input, colourTypes) {
    const userInput = validateUserInput(input)
    if (userInput === null) {
        return [isPlaying, guess, allUserGuesses]
    }

    // Backend
    let hasWon, userErrorMessage = null

    if (userInput === 'ENTER') {
        [guess, allUserGuesses, userErrorMessage] = handleGuess(word, guess, allUserGuesses, colourTypes)
        
        if (userErrorMessage === null) {
            hasWon = hasPlayerWon(allUserGuesses[allUserGuesses.length - 1].colours, colourTypes.correct)
            isPlaying = !hasGameFinished(hasWon, allUserGuesses)
        }
    }
    else if (userInput === 'BACKSPACE' || userInput === 'DELETE') {
        guess = removeLetter(guess, word)
    }
    else {
        guess = addLetter(guess, userInput)
    }

    // Frontend
    showFrame(word, guess, allUserGuesses, isPlaying, hasWon, userErrorMessage)
    
    return [isPlaying, guess, allUserGuesses]
}

function playGame() {
    showRules()

    const word = getNewWord()
    const colourTypes = { correct: "#538d4e", exists: "#b59f3b", none: "#8a8a94" }
    
    let guess = ""
    let allUserGuesses = []
    let isPlaying = true

    document.addEventListener("keydown", (event) => { // Read user inputs
        if (isPlaying) {
            [isPlaying, guess, allUserGuesses] = handleFrame(isPlaying, word.toUpperCase(), guess, allUserGuesses, event.key, colourTypes)
        }
    })
}

playGame()
