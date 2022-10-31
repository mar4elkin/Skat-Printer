document.addEventListener('DOMContentLoaded', () => {
  let button = document.getElementById('btnPrint');
  button.onclick = injectScript;

  let authorLink = document.getElementById('author_link');
  authorLink.onclick = openAuthorLink;
});

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
};

function setUiStatus(text, color, isClear=false) {
  if (!isClear) {
    document.getElementById('status').innerHTML = text;
    document.getElementById('status').style.color = color;
  } else {
    document.getElementById('status').innerHTML = ''
  }
};

async function openAuthorLink() {
  const tab = await getCurrentTab();
  await executeScript(tab.id, window.open('https://github.com/mar4elkin'));
};

async function injectScript() {
  setUiStatus('', '', true);
  const tab = await getCurrentTab();
  const [{result: modalData}] = await executeScript(tab.id, ParseModalData);
  
  if (modalData.status === 'success') {
    setUiStatus('Подготовка к печати', 'green');
    chrome.tabs.create({ url: `order.html${objectToUrl(modalData)}`});
  } else {
    setUiStatus('Окно с заказом не найдено', 'red');
  }
};

const executeScript = (tabId, func, args) => new Promise(resolve => {
  chrome.scripting.executeScript({ target: { tabId }, func, args }, resolve)
});

function objectToUrl(obj) {
  let k = Object.keys(obj);
  let v = Object.values(obj);

  return k.map((el, index) => (
    index == 0 
    ? el = `?${el}=${v[index]}`
    : `&${el}=${v[index]}`
  )).join('');
}

function ParseModalData() {
  function sortTags(tagsHtmlCollection, isPaymentMethod) {
    let payments = [];
    let options = [];
    for (let el of tagsHtmlCollection) {
      el.innerText.match(/Оплата|Наличными|плата?/gi) 
      ? payments.push(el.innerText)
      : options.push(el.innerText);
    }
    return isPaymentMethod ? payments : options;
  };

  const modalSelector = document.getElementsByClassName('order-card-modal-window');
  if (modalSelector.length == 1) {
    const modalContent = modalSelector[0].getElementsByClassName('modal-content')[0];
    const addressBox = modalContent.getElementsByClassName('address-box');
    let addressFromCollection = addressBox[0].getElementsByTagName('input');
    let addressToCollection = addressBox[1].getElementsByTagName('input');

    //номер заказа
    const orderNumber = modalContent.getElementsByClassName('title')[0].getElementsByClassName('title-text a-v')[0].innerText;
    //адрес откуда
    const addressFrom = `${addressFromCollection[1].value}${addressFromCollection[2].value == '' ? '' : `, ${addressFromCollection[2].value}`}`;
    //адрес куда
    const addressTo = `${addressToCollection[1].value}${addressToCollection[2].value == '' ? '' : `, ${addressToCollection[2].value}`}`;
    //цена
    const price = `${parseInt(modalContent.getElementsByClassName('w100 mousetrap')[0].value)} рублей`;
    //машина
    const car = modalContent.getElementsByClassName('info')[0].childNodes[1].getElementsByTagName('span')[1].title;
    //класс
    const carClass = modalContent.querySelector('[placeholder="Служба"]').value;
    //тип оплаты
    const paymentMethod = sortTags(modalContent.getElementsByClassName('tag'), true);
    //опции
    const options = sortTags(modalContent.getElementsByClassName('tag'), false);

    return {
      status: 'success',
      orderNumber: orderNumber, 
      addressFrom: addressFrom, 
      addressTo: addressTo, 
      price: price, 
      car: car, 
      carClass: carClass, 
      paymentMethod: paymentMethod, 
      options: options
    }
  }
  return {status: 'error'}
};