let empty = document.querySelector(".empty");
let searchInput = document.querySelector("#search-input");
const modal = document.getElementById("modal");
const resultsContainer = document.querySelector(".results");
const findButton = document.querySelector(".find-button");
const clearButton = document.getElementById("clear-button");
const pagination = document.querySelector(".pagination");
const prevBtn = document.getElementById("prev-btn");
const curPageInput = document.querySelector(".cur-page-input");
const nextBtn = document.getElementById("next-btn");
const pageInfo = document.getElementById("page-info");

const itemsPerPage = 20;
let currentPage = 1;
let totalPages;
let emptyReqErr = false;

let lastQuery = "";
let lastQueryPage;
let lastQueryFilter;
let peopleData = [];

function getSwitchValue() {
  const radios = document.getElementsByName("switch");
  let selectedValue;
  for (const radio of radios) {
    if (radio.checked) {
      selectedValue = radio.value;
      break;
    }
  }

  return selectedValue;
}

async function updatePeopleDisplay() {
  const query = searchInput.value;
  if (!query) {
    searchInput.style = "border: 1px solid red";
    while (resultsContainer.firstChild) {
      resultsContainer.removeChild(resultsContainer.firstChild);
    }
    currentPage = 1;
    emptyReqErr = true;
    pagination.style.display = "none";
    empty.style.display = "block";
  } else {
    searchInput.style = "border: none";
  }
  let switchValue = getSwitchValue();

  if (
    query ||
    (!emptyReqErr &&
      (query !== lastQuery ||
        currentPage !== lastQueryPage ||
        switchValue !== lastQueryFilter))
  ) {
    emptyReqErr = false;
    if (query !== lastQuery || switchValue !== lastQueryFilter) currentPage = 1;
    modal.style.display = "block";
    let res = await fetch(
      `api/egrul?query=${
        query ? query : lastQuery
      }&page=${currentPage}&filter=${switchValue}`
    );
    lastQuery = query ? query : lastQuery;
    peopleData = await res.json();
    lastQueryPage = currentPage;
    lastQueryFilter = switchValue;

    while (resultsContainer.firstChild) {
      resultsContainer.removeChild(resultsContainer.firstChild);
    }
    setTimeout(() => (modal.style.display = "none"), 1000);

    if (peopleData.persons.length) {
      totalPages = Math.ceil(peopleData.count / itemsPerPage);
      curPageInput.value = currentPage;
      pageInfo.innerHTML = totalPages;
      pagination.style.display = "block";
      updateButtons();
      const resH = document.createElement("h2");
      resH.innerHTML = "Результат поиска:";
      resultsContainer.appendChild(resH);
      for (let i = 0; i < peopleData.persons.length; i++) {
        let person = peopleData.persons[i];

        const resRow = document.createElement("div");
        resRow.className = "res-row";

        const resRowNum = document.createElement("div");
        resRowNum.className = "res-rownum";
        resRowNum.textContent = `${(currentPage - 1) * itemsPerPage + i + 1}.`;
        resRow.appendChild(resRowNum);

        const resCaption = document.createElement("div");
        resCaption.className = "res-caption";
        const link = document.createElement("a");
        link.href = `api/egrul/download?id=${person._id}`;
        link.title = "Получить выписку";
        link.innerHTML = person.legal;

        resCaption.appendChild(link);
        resRow.appendChild(resCaption);

        const resLine = document.createElement("div");
        resLine.className = "res-line";

        const resText = document.createElement("div");
        resText.className = "res-text";
        let info = [];
        if (person.ogrnip) info.push(`ОГРНИП:&nbsp;${person.ogrnip}`);
        if (person.ogrnipStart)
          info.push(`Дата присвоения ОГРНИП:&nbsp;${person.ogrnipStart}`);
        if (person.ogrn) info.push(`ОГРН:&nbsp;${person.ogrn}`);
        if (person.ogrnStart)
          info.push(`Дата присвоения ОГРН:&nbsp;${person.ogrnStart}`);
        if (person.inn) info.push(`ИНН:&nbsp;${person.inn}`);
        if (person.kpp) info.push(`КПП:&nbsp;${person.kpp}`);
        if (person.endDate)
          info.push(`Дата прекращения деятельности:&nbsp;${person.endDate}`);

        resText.innerHTML = info.join(", ");
        resLine.appendChild(resText);
        resCaption.appendChild(resLine);

        const buttonLink = document.createElement("a");
        buttonLink.href = `api/egrul/download?id=${person._id}`;

        const button = document.createElement("button");
        button.className = "download-button";
        button.textContent = "Получить выписку";
        buttonLink.appendChild(button);
        resRow.appendChild(buttonLink);

        resultsContainer.appendChild(resRow);
        empty.style.display = "none";
      }
    } else {
      const resRow = document.createElement("div");
      resRow.className = "res-row";

      const pRes = document.createElement("p");
      pRes.innerHTML = "Ничего не найдено";

      resRow.appendChild(pRes);

      resultsContainer.appendChild(resRow);
    }
  }
}

clearButton.addEventListener("click", () => {
  searchInput.value = "";
  clearButton.style.display = "none";
});

findButton.addEventListener("click", () => {
  if (searchInput.value) updatePeopleDisplay();
  setTimeout;
});

searchInput.addEventListener("input", () => {
  if (searchInput.value) {
    clearButton.style.display = "block";
  } else {
    clearButton.style.display = "none";
  }
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    updatePeopleDisplay();
    searchInput.blur();
  }
});

function updateButtons() {
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    curPageInput.value = currentPage;
    updatePeopleDisplay();
    updateButtons();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    curPageInput.value = currentPage;
    updatePeopleDisplay();
    updateButtons();
  }
});

curPageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    updatePeopleDisplay();
    curPageInput.blur();
  }
});

curPageInput.addEventListener("blur", (e) => {
  currentPage = curPageInput.value;
  if (e.target.value > totalPages) {
    currentPage = totalPages;
    e.target.value = totalPages;
  }
  if (e.target.value < 1) {
    currentPage = 1;
    e.target.value = 1;
  }
  updatePeopleDisplay();
  updateButtons();
});
