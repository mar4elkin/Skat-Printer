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
    chrome.tabs.create({ url: `order.html${objectToUrl(modalData)}`}, (tab) => {
      chrome.runtime.sendMessage({ openOrderPage: true, url: `order.html${objectToUrl(modalData)}`, createdTab: tab });
    });
  } else {
    setUiStatus(modalData.errorDescription, 'red');
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

  function checkFieldsStatus(state, ...fields) {
    fields.forEach((field, index) => {
      if (field.status === 'err') {
        state.status = 'error';
        state.errorDescription += `${field.response} `
      } else {
        state[field.name] = field.response;
      }
    });
    return state;
  }

  const modalSelector = document.getElementsByClassName('order-card-modal-window');
  if (modalSelector.length == 1) {
    let modalDataState = {
      status: 'success',
      errorDescription: '',
      orderNumber: '', 
      addressFrom: '', 
      addressTo: '', 
      price: '', 
      car: '', 
      carClass: '', 
      paymentMethod: '', 
      options: ''
    }

    const modalContent = modalSelector[0].getElementsByClassName('modal-content')[0];
    const addressBox = modalContent.getElementsByClassName('address-box');
    let addressFromCollection = addressBox[0].getElementsByTagName('input');
    let addressToCollection = addressBox[1].getElementsByTagName('input');

    //номер заказа
    function getOrderNumber() {
      try {
        let order = modalContent.getElementsByClassName('title')[0].getElementsByClassName('title-text a-v')[0].innerText;
        if (order === "Регистрация вызова") {
          return {name: 'orderNumber', status: 'err', response: 'Заказ должен быть создан!'};
        }
        return {name: 'orderNumber', status: 'success', response: order};
      } catch (e) {
        return {name: 'orderNumber', status: 'err', response: 'Номер заказа не может быть пустым!'};
      }
    }; 
    
    //адрес откуда
    function getAddressFrom() {
      try {
        let addressFrom = `${addressFromCollection[1].value}${addressFromCollection[2].value == '' ? '' : `, ${addressFromCollection[2].value}`}`;
        if (addressFromCollection[1].value == '') {
          return {name: 'addressFrom', status: 'err', response: 'Адрес отправления не может быть пустым!'};
        }
        return {name: 'addressFrom', status: 'success', response: addressFrom};
      } catch (e) {
        return {name: 'addressFrom', status: 'err', response: 'Адрес отправления не может быть пустым!'};
      }
    }; 

    //адрес куда
    function getAddressTo() {
      try {
        let addressTo = `${addressToCollection[1].value}${addressToCollection[2].value == '' ? '' : `, ${addressToCollection[2].value}`}`;
        if (addressFromCollection[1].value == '') {
          return {name: 'addressTo', status: 'err', response: 'Адрес прибытия не может быть пустым!'};
        }
        return {name: 'addressTo', status: 'success', response: addressTo};
      } catch (e) {
        return {name: 'addressTo', status: 'err', response: 'Адрес прибытия не может быть пустым!'};
      }
    }; 

    //цена
    function getPrice() {
      try {
        let price = `${parseInt(modalContent.querySelector('[placeholder="Стоимость"]').value)} рублей`;
        return {name: 'price', status: 'success', response: price};
      } catch (e) {
        return {name: 'price', status: 'err', response: 'Цена не может быть пустая!'};
      }
    };

    //машина
    function getCar() {
      try {
        let car = modalContent.getElementsByClassName('info')[0].childNodes[1].getElementsByTagName('span')[1].title;
        return {name: 'car', status: 'success', response: car};
      } catch (e) {
        return {name: 'car', status: 'err', response: 'Информация о а/м не может быть пустая!'};
      }
    };

    //класс
    function getCarClass() {
      try {
        let carClass = modalContent.querySelector('[placeholder="Служба"]').value;
        return {name: 'carClass', status: 'success', response: carClass};
      } catch (e) {
        return {name: 'carClass', status: 'err', response: 'Информация о классе а/м не может быть пустая!'};
      }
    };

    //тип оплаты
    function getPaymentMethod() {
      try {
        let paymentMethod = sortTags(modalContent.getElementsByClassName('tag'), true);
        if (paymentMethod.length == 0) {
          return {name: 'paymentMethod', status: 'err', response: 'Добавьте способ оплаты (доп. услуги)'};
        }
        return {name: 'paymentMethod', status: 'success', response: paymentMethod};
      } catch (e) {
        return {name: 'paymentMethod', status: 'err', response: 'Добавьте способ оплаты (доп. услуги)'};
      }
    };

    //опции
    function getOptions() {
      try {
        let options = sortTags(modalContent.getElementsByClassName('tag'), false);
        return {name: 'options', status: 'success', response: options};
      } catch (e) {
        return {name: 'options', status: 'err', response: e};
      }
    };

    return checkFieldsStatus(
      modalDataState, 
      getOrderNumber(),
      getAddressFrom(),
      getAddressTo(),
      getPrice(),
      getCar(),
      getCarClass(),
      getPaymentMethod(),
      getOptions()
    )
  }
  return {status: 'error', errorDescription: 'Окно с заказом не найдено'}
};