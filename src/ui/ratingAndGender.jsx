/**
 * React Component with 0-5 yellow stars and [n - (0-5)] gray stars
 * @param {JSON} props contains {rating}, rating between 0-5
 * @returns static 5-star React component 
 */
export function StarRating({ rating }){
    //if an invalid rating is passed in, render nothing
    if (rating < 0 || rating > 5) return <></>
  
    const star = "★";
  
    let nFull = Math.round(rating);
    let nEmpty = 5 - nFull;
  
    return <span>
      <span className="full-stars">{star.repeat(nFull)}</span>
      <span className="empty-stars">{star.repeat(nEmpty)}</span>
    </span>
  }
  
  /**
   * React component with the colored symbol for gender
   * @param {JSON} props contains {gender}, either "M"/"F"/"N" for male/female/non-binary
   * @returns static text React component
   */
export function GenderSymbol({ gender }){
    const male = "♂";
    const female = "♀";
    const all = "inclusive"
  
    if (gender == "m" || gender == "M") return <span className="male">{male}</span>
  
    if (gender == "f" || gender == "F") return <span className="female">{female}</span>
  
    return <span className="non-binary">{all}</span>
  }