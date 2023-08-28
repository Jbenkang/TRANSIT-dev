
let transformers = {};

let base_url = 'https://molepro.broadinstitute.org/molecular_data_provider/transformers';

let runHistory = [];


// Function to display output
function displayOutput(output) {
    document.getElementById('output').textContent = JSON.stringify(output, null, 2);
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



////////


async function performQuery(transformerName, collectionId, params = {}) {
    try {
        // Diagnostic log
        console.log("Available transformers:", transformers);
        
        const transformerData = transformers[transformerName];  // adjusted for case sensitivity
        if (!transformerData) {
            console.error(`Transformer "${transformerName}" not found.`);
            return { error: `Transformer "${transformerName}" not found.` };
        }
        
        const baseUrl = 'https://translator.broadinstitute.org/molecular_data_provider';
        let url = baseUrl + '/transform';
        let postData = {};

        if (transformerData.function === 'aggregator') {
            url = baseUrl + '/aggregate';
            postData = {
                operation: transformerName,
                collection_ids: [collectionId],
                controls: []
            };
        } else if (transformerData.function === 'elements') {
            url = baseUrl + `/collection/${collectionId}`;
        } else {
            postData = {
                name: transformerName,
                collection_id: collectionId
            };
        }






        postData = { ...postData, ...params };

        postData.controls = transformerData.parameters.map(param => {
            const inputContainer = document.getElementById(`${param.name}-container`);
            let values;
            if (inputContainer) {
                const inputs = inputContainer.getElementsByTagName('input');
                values = Array.from(inputs).map(input => input.value);
            } else {
                values = [param.default];
            }
            return {
                name: param.name,
                value: values.join(';')
            };
        });

        console.log("Sending request to:", url);
        console.log("With data:", JSON.stringify(postData));

        const response = await fetch(url, {
            method: "POST",
            mode: 'cors',
            credentials: 'same-origin',
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // assuming data.url contains the URL to fetch additional data
        const fetchedData = await fetchData(data.url);
        
        displayOutput(fetchedData);  // Assuming displayOutput is a function you've defined elsewhere

        return fetchedData; // Return fetched data

    } catch (error) {
        console.error('Error in performQuery:', error);
        return { error: error.toString() }; // Return error details
    }
}




const transformCompoundToCompound = async (collectionId, scoreThreshold, maximumNumber, maximumFdr, diseaseContext) => {
    let collections = await Promise.all([
        performQuery("ChEMBL metabolite transformer", collectionId),
        performQuery("PubChem chemical similarity transformer", collectionId),
        performQuery("ChEBI relations transformer", collectionId, {direction: 'both'}),
        performQuery("CMAP compound-to-compound expander", collectionId, {score_threshold: scoreThreshold, maximum_number: maximumNumber}),
        performQuery("CTRP compound-list expander", collectionId, {maximum_fdr: maximumFdr, disease_context: diseaseContext, maximum_number: maximumNumber})
    ]);
    return await performQuery("union", collections);
}

const transformCompoundToGene = async (collectionId, scoreThreshold, maximumNumber) => {
    let collections = await Promise.all([
        // performQuery("DrugBank target genes transformer", collectionId),
        // performQuery("DrugBank enzyme genes transformer", collectionId),
        // performQuery("DrugBank transporter genes transformer", collectionId),
        // performQuery("DrugBank carrier genes transformer", collectionId),
        performQuery("Pharos target genes transformer", collectionId),
        performQuery("ChEMBL gene target transformer", collectionId),
        performQuery("HMDB target genes transformer", collectionId),
        performQuery("Repurposing Hub target transformer", collectionId),
        performQuery("DGIdb target transformer", collectionId),
        performQuery("GtoPdb target transformer", collectionId),
        performQuery("CTD gene interactions transformer", collectionId),
        performQuery("CMAP compound-to-gene transformer", collectionId, {score_threshold: scoreThreshold, maximum_number: maximumNumber}),
        // performQuery("BiGG genes transformer", collectionId)
    ]);
    return await performQuery("union", collections);
}


const transformGeneToCompound = async (collectionId, scoreThreshold, maximumNumber) => {
    let collections = await Promise.all([
        // performQuery("DrugBank Inhibitors transformer", collectionId),
        // performQuery("DrugBank substrates transformer", collectionId),
        // performQuery("DrugBank transporter substrates transformer", collectionId),
        // performQuery("DrugBank carrier substrates transformer", collectionId),
        performQuery("DGIdb inhibitor transformer", collectionId),
        performQuery("GtopDB inhibitors transformer", collectionId),
        performQuery("CMAP gene-to-compound transformer", collectionId, {score_threshold: scoreThreshold, maximum_number: maximumNumber})
    ]);
    return await performQuery("union", collections);
}

// Workflows// Workflows

async function workflowA1(compoundName, scoreThreshold, maximumNumber, maximumFdr, diseaseContext) {
    let collectionId = await performQuery("MoleProDB name producer", compoundName)    ;
    console.log(collectionId)
    let unionCollection1 = await transformCompoundToCompound(collectionId, scoreThreshold, maximumNumber, maximumFdr, diseaseContext);
    let finalOutput = await transformCompoundToGene(unionCollection1, scoreThreshold, maximumNumber);
    displayOutput(finalOutput);
    return finalOutput;
}

async function workflowA2(compoundName, scoreThreshold, maximumNumber, maximumFdr, diseaseContext) {
    let collectionId = await performQuery("MoleProDB name producer", compoundName)    ;
    let unionCollection1 = await transformCompoundToGene(collectionId, scoreThreshold, maximumNumber);
    let unionCollection2 = await transformGeneToCompound(unionCollection1, scoreThreshold, maximumNumber);
    let unionCollection3 = await transformCompoundToCompound(unionCollection2, scoreThreshold, maximumNumber, maximumFdr, diseaseContext);
    let finalOutput = await transformCompoundToGene(unionCollection3, scoreThreshold, maximumNumber);
    displayOutput(finalOutput);
    return finalOutput;
}

async function workflowA3(compoundName, scoreThreshold, maximumNumber, maximumFdr, diseaseContext) {
    let collectionId = await performQuery("MoleProDB name producer", compoundName)    ;
    let unionCollection1 = await transformCompoundToGene(collectionId, scoreThreshold, maximumNumber);
    let unionCollection2 = await transformGeneToCompound(unionCollection1, scoreThreshold, maximumNumber);
    let unionCollection3 = await transformCompoundToCompound(unionCollection2, scoreThreshold, maximumNumber, maximumFdr, diseaseContext);
    let finalOutput = await transformCompoundToGene(unionCollection3, scoreThreshold, maximumNumber);
    displayOutput(finalOutput);
    return finalOutput;
}

async function workflowA4(compoundName, scoreThreshold, maximumNumber, maximumFdr, diseaseContext) {
    let collectionId = await performQuery("MoleProDB name producer", compoundName)    ;
    let unionCollection1 = await transformCompoundToGene(collectionId, scoreThreshold, maximumNumber);
    let unionCollection2 = await transformGeneToCompound(unionCollection1, scoreThreshold, maximumNumber);
    let unionCollection3 = await transformCompoundToCompound(unionCollection2, scoreThreshold, maximumNumber, maximumFdr, diseaseContext);
    let finalOutput = await transformCompoundToGene(unionCollection3, scoreThreshold, maximumNumber);
    displayOutput(finalOutput);
    return finalOutput;
}


function submitWorkflow() {
    // Safely get the value of each form element
    let compoundName = document.getElementById('compoundName') ? document.getElementById('compoundName').value : null;
    let scoreThreshold = document.getElementById('Score Threshold') ? document.getElementById('Score Threshold').value : null;
    let maximumNumber = document.getElementById('Maximum Number') ? document.getElementById('Maximum Number').value : null;
    let maximumFdr = document.getElementById('Maximum FDR') ? document.getElementById('Maximum FDR').value : null;
    let diseaseContext = document.getElementById('Disease Context') ? document.getElementById('Disease Context').value : null;

    // Check if the radio button for workflow selection is checked
    let selectedWorkflowElement = document.querySelector('input[name="selectedWorkflow"]:checked');
    if (selectedWorkflowElement) {
        let selectedWorkflow = selectedWorkflowElement.value;

        switch (selectedWorkflow) {
            case 'A1':
                if (compoundName) {
                    workflowA1(compoundName, scoreThreshold, maximumNumber, maximumFdr, diseaseContext)
                        .then(finalOutput => {
                            displayOutput(finalOutput);
                        });
                } else {
                    console.log("Compound name is missing");
                }
                break;
            case 'A2':
                if (compoundName) {
                    workflowA2(compoundName, scoreThreshold, maximumNumber, maximumFdr, diseaseContext)
                        .then(finalOutput => {
                            displayOutput(finalOutput);
                        });
                } else {
                    console.log("Compound name is missing");
                }
                break;
            case 'A3':
                if (compoundName) {
                    workflowA3(compoundName, scoreThreshold, maximumNumber, maximumFdr, diseaseContext)
                        .then(finalOutput => {
                            displayOutput(finalOutput);
                        });
                } else {
                    console.log("Compound name is missing");
                }
                break;
            default:
                console.log('No workflow selected');
        }
    } else {
        console.log('No workflow selected');
    }
}

// Make the submitWorkflow function globally accessible
window.submitWorkflow = submitWorkflow;





document.addEventListener("DOMContentLoaded", function () {
    const workflowRadios = document.querySelectorAll('input[name="selectedWorkflow"]');
    workflowRadios.forEach((radio) => {
        radio.addEventListener("change", function() {
            displayDynamicInputFields(this.value);
        });
    });
    
    // Initialize the default selection
    if (workflowRadios.length > 0) {
        const defaultRadio = workflowRadios[0];
        defaultRadio.checked = true;
        displayDynamicInputFields(defaultRadio.value);
    }
});

// Create a function that creates input fields with default values
function createInputField(labelText, defaultValue = '') {
    const dynamicInputFields = document.getElementById("dynamicInputFields");
    const div = document.createElement("div");
    div.className = "form-group";

    const label = document.createElement("label");
    label.innerText = labelText;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control";
    input.placeholder = `Enter ${labelText.toLowerCase()}`;
    input.value = defaultValue;

    div.appendChild(label);
    div.appendChild(input);
    dynamicInputFields.appendChild(div);
}

function displayDynamicInputFields(workflowType) {
    const dynamicInputFields = document.getElementById("dynamicInputFields");

    // Remove previous input fields
    while (dynamicInputFields.firstChild) {
        dynamicInputFields.removeChild(dynamicInputFields.firstChild);
    }

    // Add new input fields based on the selected workflow
    switch (workflowType) {
        case "A1":
            createInputField("Score Threshold", "95");
            createInputField("Maximum Number", "1");
            createInputField("Maximum FDR", "0.05");
            createInputField("Disease Context", '"pan-cancer (all lines)"');
            break;
        case "A2":
            createInputField("Score Threshold", "95");
            createInputField("Maximum Number", "1");
            break;
        case "A3":
            createInputField("Score Threshold", "95");
            createInputField("Maximum Number", "1");
            createInputField("Maximum FDR", "0.05");
            createInputField("Disease Context", '"pan-cancer (all lines)"');
            break;
        // ... add other cases if needed
        default:
            break;
    }
}

window.onload = function() {
    fetchData().then(data => {
        for (let transformer of data) {
            transformers[transformer.name] = transformer;
        }
    });
    
    
    const queryInfo = document.getElementById('compoundName');
    queryInfo.value = "aspirin";
}
