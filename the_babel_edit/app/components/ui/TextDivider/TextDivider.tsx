import React from 'react'
import styles from './TextDivider.module.css';


function TextDivider({ text }: { text: string }) {
  return (
    <div className={styles.container}>
        <h1 className={styles.text}>{ text }</h1>
        <span className={styles.divider}></span>
    </div>
  )
}

export default TextDivider