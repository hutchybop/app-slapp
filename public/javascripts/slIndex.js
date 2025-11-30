let slIndexAlertDelete = document.getElementById("slIndexAlertDelete");
slIndexAlertDelete.onsubmit = () => {
  if (!window.confirm("Do you really want to delete this Shopping List?")) {
    return false;
  }
  this.form.submit();
};
