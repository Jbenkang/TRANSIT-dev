
let transformers = {};

let base_url = 'https://molepro.broadinstitute.org/molecular_data_provider/transformers';

let runHistory = [];


let button = document.createElement('button');
button.className = 'btn btn-primary details-button';


function displayHistory() {
    let table = document.getElementById('runHistory');
    table.innerHTML = '';  // Clear previous content

    // Add a header row
    let thead = document.createElement('thead');
    let headerRow = document.createElement('tr');
    let th1 = document.createElement('th');
    th1.textContent = 'Transformer';
    let th2 = document.createElement('th');
    th2.textContent = 'Collection ID';
    headerRow.appendChild(th1);
    headerRow.appendChild(th2);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Add the history rows
    let tbody = document.createElement('tbody');
    for (let run of runHistory) {
        let tr = document.createElement('tr');
        let td1 = document.createElement('td');
        td1.textContent = run.transformer;
        let td2 = document.createElement('td');
        let a = document.createElement('a');
        a.href = run.url;
        a.textContent = run.collectionId;
        a.target = "_blank"; // This makes the link open in a new tab
        td2.appendChild(a);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
}





async function fetchData() {
    const response = await fetch(base_url, {
        method: "GET",
        mode: 'cors',
        credentials: 'same-origin',
        headers: {"Content-Type": "application/json"},
    });
    return response.json();
}

function performQuery() {
    let selectedTransformer = document.getElementById('transformerSelect').value;
    let collectionIdInputs = document.querySelectorAll('#collectionIdContainer input');
    let collectionIds = Array.from(collectionIdInputs).map(input => input.value.trim()).filter(Boolean);

    let transformerData = transformers[selectedTransformer];

    // The URL for the transformer
    let baseUrl = 'https://translator.broadinstitute.org/molecular_data_provider';
    let url = baseUrl + '/transform';

    // Check the function type of the selected transformer and adjust the URL accordingly
    let postData = {};
    if (transformerData.function === 'aggregator') {
        url = baseUrl + '/aggregate';
        postData = {
            operation: selectedTransformer,
            collection_ids: collectionIds,
            controls: []
        };
    } else if (transformerData.function === 'elements') {
        url = baseUrl + '/collection/' + collectionIds[0];
    } else {
        postData = {
            name: selectedTransformer,
            collection_id: collectionIds[0]
        };
    }

    postData.controls = transformerData.parameters.map(param => {
        let inputContainer = document.getElementById(`${param.name}-container`);
        let inputs = inputContainer.getElementsByTagName('input');
        let values = Array.from(inputs).map(input => input.value);
        return {
            name: param.name,
            value: values.join(';')
        };
    });

    // Get the query info element
    let queryInfo = document.getElementById('queryInfo');
    
    // Clear any previous query info
    queryInfo.textContent = '';

    // Display the URL and JSON payload of the POST request
    queryInfo.textContent += `Query URL: ${url}\n`;
    queryInfo.textContent += `Query JSON: ${JSON.stringify(postData, null, 2)}\n\n`;

    fetch(url, {
        method: "POST",
        mode: 'cors',
        credentials: 'same-origin',
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(postData),  // Convert the JavaScript object to a JSON string
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            return response.json();
        }
    })
    .then(data => {
        // Make a GET request to the URL from the POST result
        return fetchData(data.url);
    })
    .then(data => {
        // Display the GET result
        displayData(data);
    
        // Add the run to the history
        runHistory.push({
            transformer: selectedTransformer,
            collectionId: data.id, // Use the ID from the GET result
            url: data.url // Use the URL from the GET result
        });
    
        // Display the updated history
        displayHistory();
    })
    .catch(error => console.error('Error:', error));
    
    function fetchData(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                } else {
                    return response.json();
                }
            });
    }
}




function displayData(data) {
    let table = document.getElementById('dataDisplay');
    table.innerHTML = '';  // Clear previous content

    let tbody = document.createElement('tbody');
    table.appendChild(tbody);

    let i = 0;  // Counter for unique IDs
    iterateData(data, tbody, i);
}
function iterateData(data, parentElement, idCounter) {
    for (let key in data) {
        let tr = document.createElement('tr');

        let tdKey = document.createElement('td');
        tdKey.textContent = key;
        tr.appendChild(tdKey);

        let tdValue = document.createElement('td');
        let value = data[key];

        // If the value is an object or array, add a "Details" button and a collapsible section
        if (typeof value === 'object' && value !== null) {
            // Create a button for collapsible content
            let button = document.createElement('button');
            button.className = 'btn btn-primary';
            button.setAttribute('data-toggle', 'collapse');
            button.setAttribute('data-target', `#collapseExample${idCounter}`);
            let buttonContent = document.createElement('span');
            buttonContent.className = 'button-content';
            buttonContent.textContent = '+';
            button.appendChild(buttonContent);

            let collapseDiv = document.createElement('div');
            collapseDiv.className = 'collapse';
            collapseDiv.id = `collapseExample${idCounter}`;

            // Increase the counter for the next ID
            idCounter++;

            if (Array.isArray(value)) {
                if (value.length > 0 && typeof value[0] === 'string') {
                    // Value is an array of strings.
                    // Join the strings with a separator and display the resulting string.
                    tdValue.textContent = value.join(', ');
                } else {
                    // Value is an array of objects.
                    // Iterate through its elements as before.
                    let div = document.createElement('div');
                    for (let i = 0; i < value.length; i++) {
                        idCounter = iterateData(value[i], div, idCounter);
                    }
                    collapseDiv.appendChild(div);
                }
            } else if (typeof value === 'object' && value !== null) {
                // If the value is an object, iterate through its properties
                idCounter = iterateData(value, collapseDiv, idCounter);
            } else {
                // If the value is not an object or array, just display it
                tdValue.textContent = value;
            }

            // Add event listener to rotate the button when clicked and change the content
            button.addEventListener('click', function() {
                if (buttonContent.textContent === '-') {
                    buttonContent.textContent = '+';
                    buttonContent.classList.add('rotated');
                } else {
                    buttonContent.textContent = '-';
                    buttonContent.classList.remove('rotated');
                }
            });

            tdValue.appendChild(button);
            tdValue.appendChild(collapseDiv);
        } else {  // If the value is not an object or array, just display it
            tdValue.textContent = value;
        }

        tr.appendChild(tdValue);
        parentElement.appendChild(tr);
    }

    return idCounter;
}


function displayTransformerInfo(transformerName) {
    
    
    let transformerInfo = document.getElementById('transformerInfo');
    transformerInfo.textContent = JSON.stringify(transformers[transformerName], null, 2);
    let parametersContainer = document.getElementById('parametersContainer');

    // Clear previous parameters
    while (parametersContainer.firstChild) {
        parametersContainer.firstChild.remove();
    }

    // Create an input box for input class
// Create an input box for input class
if (transformers[transformerName].function === "producers") {
    // existing code

        let label = document.createElement('label');
        label.textContent = transformers[transformerName].knowledge_map.input_class;
        parametersContainer.appendChild(label);

        let input = document.createElement('input');
        input.className = "form-control";
        input.id = 'inputClass';
        input.placeholder = 'Enter ' + transformers[transformerName].knowledge_map.input_class;
        parametersContainer.appendChild(input);

        let breakLine = document.createElement('br');
        parametersContainer.appendChild(breakLine);
    }

    let isAggregator = transformers[transformerName].function === 'aggregator';

    // Create new input fields for parameters
    for (let param of transformers[transformerName].parameters) {
        let label = document.createElement('label');
        label.textContent = param.name;
        parametersContainer.appendChild(label);

        let inputContainer = document.createElement('div');
        inputContainer.id = `${param.name}-container`;
        inputContainer.className = "input-group mb-3";
        parametersContainer.appendChild(inputContainer);

        let input = document.createElement('input');
        input.className = "form-control";
        input.id = param.name + '0';
        input.placeholder = param.example || '';
        input.value = param.default || '';
        inputContainer.appendChild(input);

        if (isAggregator) {
            let inputGroupAppend = document.createElement('div');
            inputGroupAppend.className = "input-group-append";
            inputContainer.appendChild(inputGroupAppend);

            let addButton = document.createElement('button');
            addButton.className = "btn btn-outline-secondary";
            addButton.type = "button";
            addButton.textContent = "+";
            inputGroupAppend.appendChild(addButton);

            let removeButton = document.createElement('button');
            removeButton.className = "btn btn-outline-secondary";
            removeButton.type = "button";
            removeButton.textContent = "-";
            inputGroupAppend.appendChild(removeButton);

            addButton.onclick = function() {
                addInputField(param.name, inputContainer);
            };

            removeButton.onclick = function() {
                removeInputField(param.name, inputContainer);
            };
        }

        let breakLine = document.createElement('br');
        parametersContainer.appendChild(breakLine);
    }
}




function addInputField(paramName, inputContainer) {
    let inputs = inputContainer.getElementsByTagName('input');
    let newInput = document.createElement('input');
    newInput.className = "form-control";
    newInput.id = paramName + inputs.length;
    newInput.placeholder = '';
    inputContainer.insertBefore(newInput, inputContainer.lastChild);
}

function removeInputField(paramName, inputContainer) {
    let inputs = inputContainer.getElementsByTagName('input');
    if (inputs.length > 1) {
        inputContainer.removeChild(inputs[inputs.length - 1]);
    }
}

window.onload = function() {
    fetchData().then(data => {
        let transformerSelect = document.getElementById('transformerSelect');

        // Add initial "Please select a transformer" option
        let initialOption = document.createElement('option');
        initialOption.text = "Please select a transformer";
        initialOption.value = "";
        transformerSelect.appendChild(initialOption);

        for (let transformer of data) {
            transformers[transformer.name] = transformer;

            let option = document.createElement('option');
            option.text = transformer.name;
            option.value = transformer.name;

            if (!transformerSelect.querySelector(`optgroup[label="${transformer.function}"]`)) {
                let optgroup = document.createElement('optgroup');
                optgroup.label = transformer.function;
                transformerSelect.appendChild(optgroup);
            }

            transformerSelect.querySelector(`optgroup[label="${transformer.function}"]`).appendChild(option);
        }
    });

    // ...
// Inside window.onload function
// Inside window.onload function
transformerSelect.onchange = function() {
    if (this.value !== "") {
        displayTransformerInfo(this.value);

        let collectionIdContainer = document.getElementById('collectionIdContainer');

        // Clear previous inputs
        while (collectionIdContainer.firstChild) {
            collectionIdContainer.firstChild.remove();
        }

        // If the selected transformer is an aggregator, add two collection ID input boxes
        if (transformers[this.value].function === 'aggregator') {
            let buttonContainer = document.createElement('div');
            let label = document.createElement('label');
            label.textContent = "Change number of Collection IDs  ";
            buttonContainer.appendChild(label);

            let addButton = document.createElement('button');
            addButton.className = "btn btn-outline-secondary";
            addButton.type = "button";
            addButton.textContent = "+";
            buttonContainer.appendChild(addButton);

            let removeButton = document.createElement('button');
            removeButton.className = "btn btn-outline-secondary";
            removeButton.type = "button";
            removeButton.textContent = "-";
            buttonContainer.appendChild(removeButton);

            collectionIdContainer.appendChild(buttonContainer);

            addButton.onclick = function() {
                addInputField('collectionId', collectionIdContainer);
            };

            removeButton.onclick = function() {
                removeInputField('collectionId', collectionIdContainer);
            };

            for (let i = 0; i < 2; i++) {
                addInputField('collectionId', collectionIdContainer);
            }
        } else {
            // If the selected transformer is not an aggregator, add one collection ID input box
            let label = document.createElement('label');
            label.textContent = 'Collection ID';
            collectionIdContainer.appendChild(label);

            let input = document.createElement('input');
            input.className = "form-control";
            input.id = 'collectionId';
            collectionIdContainer.appendChild(input);
        }
    }
};






// Function to add an input field
function addInputField(inputName, inputContainer) {
    let label = document.createElement('label');
    label.textContent = inputName + ' ' + (inputContainer.getElementsByTagName('input').length + 1);
    inputContainer.appendChild(label);

    let input = document.createElement('input');
    input.className = "form-control";
    input.id = inputName + inputContainer.getElementsByTagName('input').length;
    inputContainer.appendChild(input);
}

// Function to remove an input field
function removeInputField(inputName, inputContainer) {
    let inputs = inputContainer.getElementsByTagName('input');
    let labels = inputContainer.getElementsByTagName('label');
    if (inputs.length > 1) {
        inputContainer.removeChild(inputs[inputs.length - 1]);
        inputContainer.removeChild(labels[labels.length - 1]);
    }
}
}