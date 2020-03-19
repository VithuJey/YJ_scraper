const puppeteer = require("puppeteer");
const json2xls = require("json2xls");
const axios = require("axios");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

// URL to be scraped
let URL = "https://uk.yunojuno.com/sign-in-v1/";
// day-rate array
// let rates = [700, 650, 600, 550, 500, 450, 400, 350, 300];
let rates = [350];

// Open the above URL in a browser's new page
const ping = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 926 });
  await page.setDefaultNavigationTimeout(0);
  await page.goto(URL, { waitUntil: "load" });
  return { page, browser };
};

// Evaluate & scrape
const scrape = async () => {
  // Initiate puppeteer browser instance
  let { page, browser } = await ping();
  // calling login page automation
  let next_page = await login(page);
  // calling profile automation, calling dashboard and project scraping automaion inside profile() function
  let project_JSON_arr = await profile(next_page);
  // calling write to excel file function
  // await write_to_excel(project_JSON_arr);
  // calling write to CSV file function
  await write_to_CSV(project_JSON_arr);
  // calling data posting to API endpoint function
  // await post(project_JSON_arr);
  // calling close_browser function to end automation
  await close_browser(browser);
};

// automate login process
const login = async page => {
  // check the existance of selectors
  await page.waitFor('input[name="username"]');
  await page.waitFor('input[name="password"]');
  await page.waitFor(
    'button[class="Cta Cta--primary js-spinnerButton ev-SignIn--doSignIn"]'
  );

  // fill the login form and click the button
  await page.type('input[name="username"]', process.env.USERNAME);
  await page.type('input[name="password"]', process.env.PASSWORD);
  await page.$eval(
    'button[class="Cta Cta--primary js-spinnerButton ev-SignIn--doSignIn"]',
    elem => elem.click()
  );

  // navigate to profile page
  await page.goto("https://uk.yunojuno.com/profile/manage/", {
    waitUntil: "load"
  });
  // await page.goto(
  //   "file:///E:/Fiverr/O19/YJ%20HTML/manage/Profile%20_%20YunoJuno.html",
  //   { waitUntil: "load" }
  // );

  return page;
};

// automate the procees of insering day-rate
let profile = async page => {
  let project_JSON_arr = [];

  for (let rate of rates) {
    console.log(rate);
    await page.goto("https://uk.yunojuno.com/profile/manage/", {
      waitUntil: "load"
    });
    // await page.goto(
    //   "file:///E:/Fiverr/O19/YJ%20HTML/manage/Profile%20_%20YunoJuno.html",
    //   { waitUntil: "load" }
    // );

    // check the existance of selectors
    await page.waitFor('input[name="day_rate"]');
    await page.waitFor(
      'button[class="Cta Cta--primary ev-fl-UserProfile--saveChanges"]'
    );

    // await page.$eval('#id_day_rate', el => el.value = rate + "");
    // await page.type('input[name="day_rate"]', rate + "");

    // insert day-rate
    await page.$eval(
      "input[name=day_rate]",
      (el, value) => (el.value = value),
      rate + ""
    );

    // click the button
    await page.$eval(
      'button[class="Cta Cta--primary ev-fl-UserProfile--saveChanges"]',
      elem => elem.click()
    );

    // navigate to dashboard and automate the process of scraping links for each day-rate
    let links = await dashboard(page);

    // go to each links for each day-rate and scrape the informations
    for (let link of links) {
      let project = {};
      project.rate = rate;
      project.link = link;
      project_JSON_arr.push(await project_page(page, link, project));
      // console.log(project_JSON_arr);
    }
    // for loop - end
  }

  return project_JSON_arr;
};

// automate the process of dashboard automation
let dashboard = async page => {
  await page.goto("https://uk.yunojuno.com/dashboard/", { waitUntil: "load" });
  // await page.goto(
  //   "file:///E:/Fiverr/O19/YJ%20HTML/dashboard/Dashboard%20_%20YunoJuno.html",
  //   { waitUntil: "load" }
  // );

  let proj_links = await page.evaluate(async () => {
    let links_arr = [];
    let link_elems = document.querySelectorAll(
      'div[id="js-dashboard"] > div > a'
    );

    link_elems.forEach(link_elem => {
      links_arr.push(link_elem.href);
    });

    return links_arr;
  });

  console.log(proj_links);

  return proj_links;
};

// automte the process of project page scrapping
let project_page = async (page, link, project) => {
  await page.goto(link, { waitUntil: "load" });
  // await page.goto(
  //   "file:///E:/Fiverr/O19/YJ%20HTML/project-details/Brief%20%20New%20workflow%20tool%20_%20YunoJuno.html",
  //   { waitUntil: "load" }
  // );

  let project_JSON = await page.evaluate(async () => {
    let proj = {};

    let title;
    let discipline;
    let start_date;
    let duration;
    let type;
    let location;
    let description;

    if (document.querySelectorAll("h2")[0]) {
      title = document.querySelectorAll("h2")[0].innerText;
    }
    if (
      document.querySelectorAll(
        'dl[class="DefinitionList DefinitionList--AvailabilityRequest u-ceiling"] > div > dd'
      )[0]
    ) {
      discipline = document.querySelectorAll(
        'dl[class="DefinitionList DefinitionList--AvailabilityRequest u-ceiling"] > div > dd'
      )[0].innerText;
    }
    if (
      document.querySelectorAll(
        'dl[class="DefinitionList DefinitionList--AvailabilityRequest u-ceiling"] > div > dd'
      )[1]
    ) {
      start_date = document.querySelectorAll(
        'dl[class="DefinitionList DefinitionList--AvailabilityRequest u-ceiling"] > div > dd'
      )[1].innerText;
    }
    if (
      document.querySelectorAll(
        'dl[class="DefinitionList DefinitionList--AvailabilityRequest u-ceiling"] > div > dd'
      )[2]
    ) {
      duration = document.querySelectorAll(
        'dl[class="DefinitionList DefinitionList--AvailabilityRequest u-ceiling"] > div > dd'
      )[2].innerText;
    }
    if (
      document.querySelectorAll(
        'dl[class="DefinitionList DefinitionList--AvailabilityRequest u-ceiling"] > div > dd'
      )[3]
    ) {
      type = document.querySelectorAll(
        'dl[class="DefinitionList DefinitionList--AvailabilityRequest u-ceiling"] > div > dd'
      )[3].innerText;
    }
    if (
      document.querySelectorAll(
        'dl[class="DefinitionList DefinitionList--AvailabilityRequest u-ceiling"] > div > dd'
      )[4]
    ) {
      location = document.querySelectorAll(
        'dl[class="DefinitionList DefinitionList--AvailabilityRequest u-ceiling"] > div > dd'
      )[4].innerText;
    }
    if (
      document.querySelector('p[class="u-wordWrap--breakWord u-marginY--0"]')
    ) {
      description = document.querySelector(
        'p[class="u-wordWrap--breakWord u-marginY--0"]'
      ).innerText;
    }

    proj.title = title;
    proj.discipline = discipline;
    proj.start_date = start_date;
    proj.duration = duration;
    proj.type = type;
    proj.location = location;
    proj.description = description;

    return proj;
  });

  project.title = project_JSON.title;
  project.discipline = project_JSON.discipline;
  project.start_date = project_JSON.start_date;
  project.duration = project_JSON.duration;
  project.type = project_JSON.type;
  project.location = project_JSON.location;
  project.description = project_JSON.description;

  return project;
};

// fill the excel file and create it insude the root folder
let write_to_excel = async JSON_arr => {
  const data = await json2xls(JSON_arr);
  await fs.writeFileSync("jobs.xlsx", data, "binary");
};

let write_to_CSV = async JSON_arr => {
  const data = await json2xls(JSON_arr);
  await fs.writeFileSync("jobsCSV.csv", data, "binary");
};

// post the data to API endpoint
// let post = async JSON_arr => {
//   const url = "yj.002.codeaddicts.io";
//   axios
//     .post(url, JSON_arr)
//     .then(console.log("Data has been posted successfully"))
//     .catch(err => {
//       console.log(err);
//     });
// };

// Close the browser
let close_browser = async browser => {
  await browser.close();
};

// Call scrape() to start the automation and scraping
scrape();
