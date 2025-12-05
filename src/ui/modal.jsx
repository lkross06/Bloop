import ReactDOM from "react-dom/client";

/**
 * Attempts to remove a currently active modal, closing any other modals in the process (only one active at a time)
 * @returns true if successful and there was a modal to close, false otherwise
 */
export function closeModal(){
    try{
      let modal = document.getElementById("modal");
      modal.remove();
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Renders a new modal that closes onclick outside of modal body
   * @param {*} modalContent JSX HTML content for modal body
   */
  export function openModal(modalContent){
  
    closeModal();
  
    //make the span the first child in <body>
    var span = document.createElement("span");
    span.setAttribute("id", "modal");
    document.body.insertBefore(span, document.body.firstChild);
  
    ReactDOM.createRoot(span).render(
      <>
      <div onClick={(event) => { event.target.remove(); }} id="modal-container">
        <div onClick={(event) => { event.stopPropagation(); /* do nothing onClick */ }} id="modal-body"> 
          {modalContent}
        </div>
      </div>
      </>
    );
  }