javascript:(async function(){
  "use strict";

  if (window.location.href.match(/(?<=www.workato.com\/recipes\/)\d+/) == null) {
    return alert('This is not a valid Workato recipe page to export job reports.\nTry again on a Workato recipe page.');
  }

  try {
    if (!confirm('This is a function to export job reports from a recipe.')) {
      return alert('Exiting.');
    }

    let recipe_id = window.location.href.match(/(?<=workato.com\/recipes\/)\d+/);

    if (!confirm(`Export job report for recipe ID: ${recipe_id} ?\nThis process might take some time depending on number of jobs.\nDo not navigate away from current page.`)) {
      return alert('Exiting.');
    }

    let job_count = (await (await fetch(`https://www.workato.com/recipes/${recipe_id}/jobs.json`)).json()).job_count;
    let jobs_limit = prompt('Specify number of jobs (ordered by most recent) that you want to limit the report to. Skip this if you want everything.');
    jobs_limit = jobs_limit ? parseInt(jobs_limit) : job_count;

    if ((!jobs_limit) || jobs_limit < 0) {
      return alert('Invalid number of jobs');
    }

    let progress_bar = setupUI();
    progress_bar.setAttribute('max', jobs_limit);

    let job_pages = Math.ceil(job_count / 25.0);
    let job_reports = [];
    let next_url = `https://www.workato.com/recipes/${recipe_id}/jobs.json?rerun_only=false&status=all&offset_count=true`;
    let current_page = 1;
    let results = [];

    do {
      results = await extract_page(next_url);
      if (results) {
        job_reports = job_reports.concat(results);
        let last_job_id = results[results.length - 1].id;
        next_url = `https://www.workato.com/recipes/${recipe_id}/jobs.json?rerun_only=false&status=all&offset_job_id=${last_job_id}&offset_job_rerun_id=${last_job_id}&prev=false&offset_count=false`;
      }
      current_page += 1;
      console.log(`${job_reports.length} out of ${job_count}`);
      progress_bar.setAttribute('value', job_reports.length);
    } while (results && (job_reports.length < jobs_limit));

    job_reports = job_reports.slice(0, jobs_limit);
    download_file(recipe_id, generate_csv(job_reports));
  }
  catch(error) {
    console.error(error);
    alert('An error occurred. View developer console for more info.');
  }

  async function extract_page(url) {
    let jobs = (await (await fetch(url)).json()).jobs;
    if (jobs.length > 0) {
      return jobs.map(job => {
        let report = JSON.parse(job.report || "{}");
        return {
          id: job.id,
          started_at: job.started_at,
          completed_at: job.completed_at,
          status: job.status,
          title: job.title,
          custom_col_1: report.custom_column_1,
          custom_col_2: report.custom_column_2,
          custom_col_3: report.custom_column_3,
          custom_col_4: report.custom_column_4,
          custom_col_5: report.custom_column_5
        };
      });
    } else {
      return null;
    }
  }

  function generate_csv(records) {
    let replacer = (key, value) => value === null ? '' : value; /* specify how you want to handle null values here */
    let header = Object.keys(records[0]);
    let csv = records.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');
    return csv;
  }

  function download_file(recipe_id, csv) {
    const a = window.document.createElement('a');
    a.href = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `recipe_${recipe_id}_jobs.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function setupUI() {
    let target_container = document.getElementById('current-recipe');

    target_container.innerHTML = `
      <div style="padding: 5em 5em 5em 5em;">
        <h2>Generating report...</h2>
        <progress id="export_job_reports_progress" max="100" value="0" style="width: 100%;"></progress>
      </div>
    `;

    return document.getElementById('export_job_reports_progress');
  }
})();
