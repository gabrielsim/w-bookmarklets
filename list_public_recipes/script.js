javascript:(function(){
  "use strict";

  if (window.location.hostname != 'www.workato.com' || window.location.pathname.startsWith('/dashboard') == false) {
    alert('This can only be activated from the Workato Dashboard');
    return;
  }

  try {
    setupUI();

    fetch('/folders')
    .then(response => response.json())
    .then(async function(data) {
      let folders = traverseFolders(data.result.folders).flat(Infinity);
      for (let folder of folders) {
        await processFolder(folder);
      }
      removeUISpinner();
    });
  }
  catch(error) {
    console.error(error);
    alert('An error occurred. View developer console for more info.');
  }

  async function processFolder(folder) {
    return new Promise(async function(resolve, reject) {

      let folderMetaData = await (await fetch(`/lists/fetch?folder_id=${folder.id}&page=1&context=all_flows`)).json();
      let numPages = Math.ceil(folderMetaData.count / 10);
      let pagePromises = Array(numPages).fill(0).map(function (_v, index) {
        return fetch(`/lists/fetch?folder_id=${folder.id}&page=${index + 1}&context=all_flows`)
        .then(response => response.json());
      });

      Promise.all(pagePromises).then(pages => {
        let recipes = pages.map(
          page => page.items.map(
            item => item.id
            )
          )
        .flat(2);

        let recipePromises = recipes.map(function(recipe_id) {
          return fetch(`/recipes/${recipe_id}/status.json`)
          .then(response => response.json())
          .then(data => {
            if (data.flow.visibility_private === false) {
              let folder_path = data['folders'].map(o => o['name']).join('/');
              addRecipeToUI(recipe_id, data['flow']['name'], folder_path);
            }
          });
        });


        Promise.all(recipePromises).then(function() {
          resolve('ok');
        });
      });
    });
  }

  function traverseFolders(data) {
    let children = data.children.map(o => traverseFolders(o));
    return [{ name: data.name, id: data.id}, children]
  }

  function setupUI() {
    /* Toggle current navigation tab inactive */
    let activeNavigationTab = document.getElementsByClassName('tab-navigation__tab_active tab-navigation__tab_bordered')[0];
    activeNavigationTab.classList.remove('tab-navigation__tab_bordered', 'tab-navigation__tab_active');

    /* Insert Public Recipes tab */
    let navigationTabs = document.getElementsByClassName('tab-navigation__tabs')[0];
    navigationTabs.innerHTML += `
      <a class="tab-navigation__tab ng-star-inserted tab-navigation__tab_active tab-navigation__tab_bordered" href="audit">
        <div class="tab-navigation__tab-content">
          <span class="tab-navigation__item-icon ng-star-inserted">
            <w-svg-icon>
              <svg class="svg-icon svg-icon_tabs-audit" width="14" height="14">
                <use xlink:href="#tabs/audit"></use>
              </svg>
            </w-svg-icon>
          </span>
          <span class="tab-navigation__item-text"> Public Recipes </span>
        </div>
      </a>
    `;

    /* Overwrite Main Div */
    let targetFrame = document.getElementsByClassName('w-page-content')[0];
    targetFrame.classList.add('w-page-content_single');

    targetFrame.innerHTML = `
      <div class="dashboard-audit-log__group ng-star-inserted">
          <ul class="dashboard-audit-log__items" style="margin-top:2em; margin-bottom:2em;">
          </ul>
          <div id="spinner" class="spinner__content spinner__content_large spinner__content_default" style="place-content: center; margin:2em;">
              <div class="spinner__bar ng-star-inserted"></div>
              <div class="spinner__bar ng-star-inserted"></div>
              <div class="spinner__bar ng-star-inserted"></div>
              <div class="spinner__bar ng-star-inserted"></div>
              <div class="spinner__bar ng-star-inserted"></div>
              <div class="spinner__bar ng-star-inserted"></div>
              <div class="spinner__bar ng-star-inserted"></div>
              <div class="spinner__bar ng-star-inserted"></div>
          </div>
      </div>
    `;
  }

  function addRecipeToUI(recipe_id, recipe_name, folder_path) {
    let entriesTable = document.getElementsByClassName('dashboard-audit-log__items')[0];
    entriesTable.insertAdjacentHTML('beforeend', `
      <li class="dashboard-audit-log__item ng-star-inserted">
          <w-dashboard-audit-log-item>
              <div class="dashboard-audit-log-item">
                <w-resource-icon classname="dashboard-audit-log-item__type">
                    <div class="resource-icon resource-icon_recipe dashboard-audit-log-item__type">
                        <div class="resource-icon__spacer"></div>
                        <w-svg-icon class="resource-icon__icon">
                            <svg class="svg-icon svg-icon_resource-icon-recipe" width="14" height="14">
                                <use xlink:href="#resource-icon/recipe"></use>
                            </svg>
                        </w-svg-icon>
                    </div>
                </w-resource-icon>
                <div class="dashboard-audit-log-item__content">
                    <div class="dashboard-audit-log-item__message"><a class="dashboard-audit-log-item__message-link ng-star-inserted" target="_blank" wmixpanellink="Audit log: open resource" href="/recipes/${recipe_id}">${recipe_name}</a>
                    </div>
                    <div class="dashboard-audit-log-item__additional"><span>${folder_path}</span>
                    </div>
                </div>
              </div>
          </w-dashboard-audit-log-item>
      </li>
    `);
  }

  function removeUISpinner() {
    document.getElementById('spinner').remove();
  }
})();