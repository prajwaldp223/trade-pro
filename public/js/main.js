document.addEventListener("DOMContentLoaded", () => {
  // Mobile menu toggle
  const menuToggle = document.getElementById("menu-toggle")
  const mobileMenu = document.getElementById("mobile-menu")

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("active")
    })
  }

  // Tabs functionality
  const tabs = document.querySelectorAll(".tab")
  const tabContents = document.querySelectorAll(".tab-content")

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab")

      // Remove active class from all tabs and contents
      tabs.forEach((t) => t.classList.remove("active"))
      tabContents.forEach((c) => c.classList.remove("active"))

      // Add active class to clicked tab and corresponding content
      tab.classList.add("active")
      document.getElementById(target).classList.add("active")
    })
  })

  // Auto-hide alerts after 5 seconds
  const alerts = document.querySelectorAll(".alert")

  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = "0"
      setTimeout(() => {
        alert.style.display = "none"
      }, 500)
    }, 5000)
  })

  // Stock quantity input validation
  const quantityInput = document.getElementById("quantity")

  if (quantityInput) {
    quantityInput.addEventListener("input", function () {
      const value = Number.parseInt(this.value)
      if (isNaN(value) || value < 1) {
        this.value = 1
      }

      // Update total cost/value
      updateTotal()
    })
  }

  // Update total cost/value based on quantity
  function updateTotal() {
    const quantityInput = document.getElementById("quantity")
    const priceElement = document.getElementById("stock-price")
    const totalElement = document.getElementById("total-amount")

    if (quantityInput && priceElement && totalElement) {
      const quantity = Number.parseInt(quantityInput.value) || 1
      const price = Number.parseFloat(priceElement.dataset.price)
      const total = (quantity * price).toFixed(2)

      totalElement.textContent = `$${total}`
    }
  }

  // Initialize total calculation
  updateTotal()

  // Form validation
  const forms = document.querySelectorAll("form")

  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      const requiredInputs = form.querySelectorAll("[required]")
      let isValid = true

      requiredInputs.forEach((input) => {
        if (!input.value.trim()) {
          isValid = false
          const formGroup = input.closest(".form-group")

          if (formGroup) {
            const errorElement = formGroup.querySelector(".form-error") || document.createElement("div")
            errorElement.className = "form-error"
            errorElement.textContent = "This field is required"

            if (!formGroup.querySelector(".form-error")) {
              formGroup.appendChild(errorElement)
            }
          }
        }
      })

      if (!isValid) {
        event.preventDefault()
      }
    })
  })
})

