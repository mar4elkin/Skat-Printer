document.addEventListener('DOMContentLoaded', () => {
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });

  document.getElementById('orderNumber').innerHTML = params.orderNumber
  document.getElementById('addressFrom').innerHTML = params.addressFrom
  document.getElementById('addressTo').innerHTML = params.addressTo
  //document.getElementById('carClass').innerHTML = params.carClass
  document.getElementById('paymentMethod').innerHTML = params.paymentMethod
  //document.getElementById('options').innerHTML = params.options
  document.getElementById('price').innerHTML = params.price
  document.getElementById('car').innerHTML = params.car
  window.addEventListener('afterprint', (e) => {
    window.close()
  });
  window.print();
});