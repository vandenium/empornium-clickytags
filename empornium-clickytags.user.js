// ==UserScript==
// @name        Empornium ClickyTags
// @description A clickable Top 300 menu of tags.
// @namespace   Empornium
// @match       https://www.empornium.is/torrents.php?id*
// @grant       none
// @version     1.0.0
// @author      vandenium
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// Version
// ==/UserScript==
// Changelog:
// Version 1.0.0
//  - The initial version.
//  - Features
//    - Popup menu of Top 300 tags
//    - Click to toggle adding/removing tag to the tags field
//    - Indicates pre-existing tags (not selectable)
//    - Updates tag list weekly for performance.
//    - Works with Emp++ Tag Highlighter
// Future:
//  - Make configurable? Top 100, 200, 300...
//  - Track/indicate most frequently used tags

const addLink = () => {
  const link = document.createElement('a');
  link.href = '#';
  link.textContent = 'Top 300 Tags';
  link.id = 'clickytags-link'

  link.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu(e);
  });
  document.querySelector('#tag_container').append(link);
  return link;
}

const optionsKey = 'empornium-clickytags-options';
const getCache = () => {
  const cache = GM_getValue(optionsKey);
  if (cache) {
    const rawOptions = JSON.parse(cache);
    console.log('Options from GM: ', JSON.stringify(rawOptions, null, 4));
    rawOptions.date = new Date(rawOptions.date);
    return rawOptions;
  }
  // First time through
  const firstEntry = {
    date: new Date('1/1/1970'),
    tags: [],
  };
  writeToCache(firstEntry);
  return firstEntry;
}
const writeToCache = (cacheValue) => {
  console.log(`Setting cache to ${optionsKey}:`, cacheValue);
  GM_setValue(optionsKey, JSON.stringify(cacheValue));
};

const hideMenu = () => document.querySelector('#clickytags-container').remove();

function getPreviouslySelectedTags() {
  return Array.from(document.querySelectorAll('#torrent_tags_list li a[href*="torrents"]')).map(v => v.textContent);
}

const createTagContainer = (tagNames, cache) => {
  const template = `
  
  <style>
  .flex-grid {
    display: flex;
  }
  .col {
    flex: 1;
  }
  
  a.tag {
    cursor: pointer;
    display: block;
  }
  
  span.tag-container a.selected:after {
    content: " ✔️";
  }
  
  div#clickytags-container  {
    position:absolute;
    right: 0;
    background-color: rgba(0, 0, 0, 0.9);
    padding: 5px;
    border: solid #333 1px;
    border-radius: 5px;
    display: none;
    width: 87%;
  }
  
  div#clickytags-container #close {
    float: right;
    display: inline-block;
  }
  
  div#clickytags-container h3 {
    display: inline-block;
    width: 80%;
  }
  
  div#clickytags-container #close {
    line-height: 2em;
    width: 2em;
    border-radius: 20px;
    background-color: rgb(20, 20, 20, 0.9);
    text-align: center;
  }
  
  div#clickytags-container #close:hover {
    cursor: pointer;
    background-color: rgb(40, 40, 40, 0.9)
  }
  
  .previously-selected {
    pointer-events: none;
  }
  
  .previously-selected:after {
    content: " 🏷️";
  }
  
</style>
<div>
<h3>Top 300 Tags since ${cache.date}. (cache refreshes weekly)</h3>
  <div id='close'>✖️</div>
</div>

<div>
  <div class="flex-grid">
  <div class="col" id='col1'></div>
  <div class="col" id='col2'></div>
  <div class="col" id='col3'></div>
  <div class="col" id='col4'></div>
  <div class="col" id='col5'></div>
</div>
`;

  const tagInput = document.querySelector('#taginput');
  const div = document.createElement('div');
  div.id = 'clickytags-container';
  div.innerHTML = template;

  tagNames.forEach((tagName, i) => {
    const tagElContainer = document.createElement('span');
    tagElContainer.style.display = 'block';
    tagElContainer.classList.add('tag-container');

    const tagEl = document.createElement('a');
    tagEl.classList.add('tag');
    tagEl.innerText = tagName + ' ';
    let colSelector;
    if (i < 60) {
      colSelector = '#col1'
    } else if (i >= 60 && i < 120) {
      colSelector = '#col2'
    } else if (i >= 120 && i < 180) {
      colSelector = '#col3';
    } else if (i >= 180 && i < 240) {
      colSelector = '#col4';
    } else {
      colSelector = '#col5';
    }


    tagEl.addEventListener('click', (e) => {
      e.preventDefault();
      tagInput.value += `${tagName} `;

      if (tagEl.classList.contains('selected')) {
        tagEl.classList.remove('selected');
        tagInput.value = tagInput.value.split(' ').filter(val => val !== tagName).join(' ');
      } else {
        tagEl.classList.add('selected');
      }

    });

    tagElContainer.append(tagEl);

    div.querySelector(colSelector).appendChild(tagElContainer);
  });

  div.querySelector('#close').addEventListener('click', toggleMenu);

  return div;
};

const addToPage = (tagContainer) => {
  const parentContainer = document.createElement('div');
  parentContainer.style.width = '100%';
  const target = document.querySelector('#details_top');
  tagContainer.style.display = 'none';
  parentContainer.append(tagContainer);
  target.append(parentContainer);
};


const processTags = (htmlArray, cache) => {
  let tagNamesAll = [];

  htmlArray.forEach(html => {
    const dom = stringToHTML(html);
    const tagNames = Array.from(dom.querySelectorAll('.tag_results tr.rowa a[href], .tag_results tr.rowb a[href]'))
      .map(a => a.textContent.replace(/\*/, ''));

    tagNamesAll = tagNamesAll.concat(tagNames);

  })

  const tagNamesSorted = tagNamesAll.sort();
  const tagContainer = createTagContainer(tagNamesSorted, cache);
  const link = addLink();
  addToPage(tagContainer);
  return tagNamesSorted;
}

const stringToHTML = (str) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/html');
  return doc.body;
};

const urls = [
  'https://www.empornium.is/tags.php',
  'https://www.empornium.is/tags.php?page=2',
  'https://www.empornium.is/tags.php?page=3'
];

const addToCache = (tagNamesSorted) => {
  writeToCache({
    date: new Date(),
    tags: tagNamesSorted,
  });
};

const toggleMenu = (e) => {
  const tagMenu = document.querySelector('#clickytags-container');

  if (tagMenu.style.display === 'none') {
    tagMenu.style.display = 'block';
  } else {
    tagMenu.style.display = 'none';
  }
}

const closeMenu = () => document.querySelector('#clickytags-container').style.display = 'none';
const cache = getCache();
const now = new Date();
const refreshInterval = 604800000; // 1 week.

if (cache.date.getTime() + refreshInterval < now.getTime()) { // add to cache
  Promise.all(urls.map(u => fetch(u)))
    .then(responses => Promise.all(responses.map(res => res.text())))
    .then(htmlArray => {
      const tagNamesSorted = processTags(htmlArray, cache);
      addToCache(tagNamesSorted);
    })
} else {
  const tagContainer = createTagContainer(cache.tags, cache);
  addToPage(tagContainer);
  const link = addLink();
}

document.querySelector('body').addEventListener('keyup', (e) => {
  if (e.key === 'Escape') {
    closeMenu();
  }
});

// After tag section renders, update the tag container with existing tags.
window.setTimeout(() => {
  const tagContainer = document.querySelector('#clickytags-container');
  const allTags = Array.from(tagContainer.querySelectorAll('span'));
  const previouslySelectedTags = getPreviouslySelectedTags();
  allTags.forEach(tagDom => {
    const tagName = tagDom.firstChild.textContent;
    if (previouslySelectedTags.includes(tagName.trim())) {
      tagDom.firstChild.classList.add('previously-selected');
    }
  });
}, 1000);