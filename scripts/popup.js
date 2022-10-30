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
    const [{result: printData}] = await executeScript(tab.id, generatePrintImage, [modalData]);
    setUiStatus(printData.status, 'green');
  } else {
    setUiStatus('Окно с заказом не найдено', 'red');
  }
};

const executeScript = (tabId, func, args) => new Promise(resolve => {
  chrome.scripting.executeScript({ target: { tabId }, func, args }, resolve)
});

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

function generatePrintImage(modalData) {
  let win = window.open('about:blank', "_new");
  win.document.open();
  win.document.write(`
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300&display=swap" rel="stylesheet"> 
        <style type="text/css">
          h1, h2, h3, h4, h5, p, pre, span {
            font-family: 'Roboto', sans-serif;
          }
          .img_center {
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          #root {
            display: flex;
            justify-content: center;
            flex-direction: column;
            margin-left: 20px;
            margin-right: 20px;
          }
          #root h3 {
            font-weight: 300;
            margin-top: 15px;
            margin-bottom: 15px;
          }
          .footer {
            font-weight: 300;
            text-align: center;
          }
          @page {
            size: A4;
            margin: 0;
          }
          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
            }
          }
        </style>
      </head>
      <body onload="window.print()" onafterprint="window.close()">
        <div id="root">
          <img class="img_center" src="https://taxipulkovo.com/assets/images/logo.png" />
          <h3>Бланк заказа: <b>${modalData.orderNumber}</b></h3>
          <h3>Откуда: <b>${modalData.addressFrom}</b></h3>
          <h3>Куда: <b>${modalData.addressTo}</b></h3>
          <h3>Класс: <b>${modalData.carClass}</b></h3>
          <h3>Способ оплаты: <b>${modalData.paymentMethod}</b></h3>
          <h3>Доп. услуги: <b>${modalData.options}</b></h3>
          <h3>Стоимость: <b>${modalData.price}</b></h3>
          <h3>№ а/м такси: <b>${modalData.car}</b></h3>
          <h3 class="footer">Данный бланк заказа не является платежным документом</h3>
          <h3 class="footer">ООО "Управляющая компания<br/>Такси Пулково""</h3>
          <h3 class="footer">8(812)677-86-35</h3>
          <h3 class="footer">info@taxipulkovo.com</h3>
          <h3 class="footer">Сохраняйте бланк заказа до конца поездки!</h3>
        </div>
      </body>
    </html>
  `);
  win.document.close();
  return {status: "Отправлено на печать"}
};