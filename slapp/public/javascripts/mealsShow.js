let mealsShowAlertDelete = document.getElementById('mealsShowDelete')
mealsShowAlertDelete.onsubmit = () => {
    if(!confirm("Do you really want to delete this Meal?")) {
      return false;
    }
    this.form.submit();
}