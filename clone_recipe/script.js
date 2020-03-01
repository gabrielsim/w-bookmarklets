javascript:(function(){
  "use strict";

  if (window.location.href.match(/(?<=www.workato.com\/recipes\/)\d+/) == null) {
    return alert('This is not a valid Workato recipe page to perform recipe clone.\nTry again on a Workato recipe page.');
  }

  try {
    if (!confirm('This is a function to clone a recipe without creating a parent-child relationship.')) {
      return alert('Exiting.');
    }

    let recipe_id = window.location.href.match(/(?<=workato.com\/recipes\/)\d+/);

    if (!confirm(`Clone recipe ID: ${recipe_id} ?\nThis process takes about 15 seconds.\nDo not navigate away from current page.`)) {
      return alert('Exiting.')
    }

    fetch('/recipes/import')
    .then(response => response.text())
    .then(data => {

      let authenticity_token = data.match(/(?<="authenticity_token" value=").+(?=")/)[0];

      fetch(`/recipes/${recipe_id}/export`)
      .then(response => response.text())
      .then(yaml => {

        fetch(`/recipes/${recipe_id}.json`)
        .then(response => response.json())
        .then(recipe => {

          let config = recipe.result.recipe_data.flow.config;
          let folder_id = recipe.result.recipe_data.flow.folder_id;
          /* TODO: Improve YAML injection instead of regex replacement */
          let modifiedYaml = yaml.replace(/^  name: /gm, `  name: Copy of `).replace(/^  config:(.)*/gm, `  config: '${config}'`) +
            "\ \ visibility_private: true\n" + `\ \ folder_id: ${folder_id}\n`;
          let cloned_recipe = new Blob([modifiedYaml], { type: 'application/yaml' });

          let formData = new FormData();
          formData.append('utf8', '✓');
          formData.append('authenticity_token', authenticity_token);
          formData.append('command', 'Import');
          formData.append('flow_import[file]', cloned_recipe, 'recipe.yaml');
          formData.append('flow_import[shared_accounts]', 0);

          fetch('/recipes/import_create', {
            method: 'POST',
            body: formData
          })
          .then(response => response.json())
          .then(data => {

            let cloned_recipe_id = data.result.recipe_data.flow.id;
            if (cloned_recipe_id) {
              alert('Recipe cloning completed. You will now be redirected to the cloned recipe.');
              window.location.href = `/recipes/${cloned_recipe_id}`;
            } else {
              return alert(JSON.stringify(data));
            }
          });
        });
      });
    });
  }
  catch(error) {
    console.error(error);
    alert('An error occurred. View developer console for more info.')
  }
})();
