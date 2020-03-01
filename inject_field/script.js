javascript:(function(){
  "use strict";

  if (window.location.href.match(/(?<=www.workato.com\/recipes\/)\d+/) == null) {
    return alert('This is not a valid Workato recipe page to inject an output data pill.\nTry again on a Workato recipe page.');
  }

  try {
    if (!confirm("This is a function to inject an output data pill into a recipe step.\n\nPlease ensure recipe is saved first before continuing.")) {
      return alert('Exiting.');
    }

    let recipe_id = window.location.href.match(/(?<=workato.com\/recipes\/)\d+/);

    let recipe_step = prompt('Which step do you want to inject a new output data pill into? e.g. 1 for trigger, 2, 3, etc.');
    if (!recipe_step) {
      return alert('Invalid recipe step. Exiting.');
    }
    
    recipe_step = parseInt(recipe_step);
    let field_name = prompt('What is the field name to inject?');
    if (!field_name) {
      return alert('Invalid field name. Exiting.');
    }

    fetch(`/api/recipes/${recipe_id}`)
    .then(response => response.json())
    .then(data => {

      let code = JSON.parse(data.code);

      let block = find_block(code, recipe_step - 1); /* change one-based indexing to zero-based */
      if (!block) {
        return alert(`Could not find step ${recipe_step}. Exiting.`);
      }

      if (!(block.name && (block.keyword === 'trigger' || block.keyword === 'action'))) {
        return alert('You can only inject data pill into an configured application trigger/action');
      }

      if (!confirm(`Confirm that you want to add an output data pill [${field_name}] to Step ${recipe_step}: ${block.provider} ${block.name}`)) {
        return alert('Exiting.');
      }

      let new_field = [{
        name: field_name,
        custom: true 
      }];
      block.extended_output_schema = (block.extended_output_schema || []).concat(new_field);

      fetch(`/api/recipes/${recipe_id}`, {
        method: 'PUT',
        body: JSON.stringify({ 'code': JSON.stringify(code) }),
        headers: {
          'content-type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {

        if (data.success == true ) {
          alert('Success! Page will now reload to reflect the new changes.');
          window.location.href = `/recipes/${recipe_id}`;
        } else {
          return alert(JSON.stringify(data));
        }
      });
    });
  }
  catch(error) {
    console.error(error);
    alert('An error occurred. View developer console for more info.')
  }

  function find_block(code, step_number) {
    if (code.number == step_number) {
      return code;
    } else {
      for (let index in code.block) {
        res = find_block(code.block[index], step_number);
        if (res) {
          return res;
        }
      }
    }
    return null;
  }
})();
