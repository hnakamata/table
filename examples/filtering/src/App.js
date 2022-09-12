import React from 'react'
import styled from 'styled-components'
import { useTable, useFilters, useGlobalFilter, useAsyncDebounce, useRowSelect } from 'react-table'
// A great library for fuzzy filtering/sorting items
import matchSorter from 'match-sorter'

import makeData from './makeData'

const Styles = styled.div`
  padding: 1rem;

  table {
    border-spacing: 0;
    border: 1px solid black;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      :last-child {
        border-right: 0;
      }
    }
  }
`

// Define a default UI for filtering
function GlobalFilter({
                        preGlobalFilteredRows,
                        globalFilter,
                        setGlobalFilter,
                      }) {
  const count = preGlobalFilteredRows.length
  const [value, setValue] = React.useState(globalFilter)
  const onChange = useAsyncDebounce(value => {
    setGlobalFilter(value || undefined)
  }, 200)

  return (
      <span>
      Search:{' '}
        <input
            value={value || ""}
            onChange={e => {
              setValue(e.target.value);
              onChange(e.target.value);
            }}
            placeholder={`${count} records...`}
            style={{
              fontSize: '1.1rem',
              border: '0',
            }}
        />
    </span>
  )
}

// Define a default UI for filtering
function DefaultColumnFilter({
                               column: { filterValue, preFilteredRows, setFilter },
                             }) {
  const count = preFilteredRows.length
  React.useEffect(() => {
    setFilter('');
  }, []);

  return (
      <input
          value={filterValue || ''}
          onChange={e => {
            setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
          }}
          placeholder={`Search ${count} records...`}
      />
  )
}

function fuzzyTextFilterFn(rows, id, filterValue) {
  return matchSorter(rows, filterValue, { keys: [row => row.values[id]] })
}

// Let the table remove the filter if the string is empty
fuzzyTextFilterFn.autoRemove = val => !val

const IndeterminateCheckbox = React.forwardRef(
    ({ indeterminate, ...rest }, ref) => {
      const defaultRef = React.useRef()
      const resolvedRef = ref || defaultRef

      React.useEffect(() => {
        resolvedRef.current.indeterminate = indeterminate
      }, [resolvedRef, indeterminate])

      return (
          <>
            <input type="checkbox" ref={resolvedRef} {...rest} />
          </>
      )
    }
)

// Our table component
function Table({ columns, data }) {
  const filterTypes = React.useMemo(
      () => ({
        // Add a new fuzzyTextFilterFn filter type.
        fuzzyText: fuzzyTextFilterFn,
        // Or, override the default text filter to use
        // "startWith"
        text: (rows, id, filterValue) => {
          return rows.filter(row => {
            const rowValue = row.values[id]
            return rowValue !== undefined
                ? String(rowValue)
                    .toLowerCase()
                    .startsWith(String(filterValue).toLowerCase())
                : true
          })
        },
      }),
      []
  )

  const defaultColumn = React.useMemo(
      () => ({
        // Let's set up our default Filter UI
        Filter: DefaultColumnFilter,
      }),
      []
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    visibleColumns,
    preGlobalFilteredRows,
    setGlobalFilter,
    toggleAllRowsSelected,
    state: { selectedRowIds,},
  } = useTable(
      {
        columns,
        data,
        defaultColumn,
        filterTypes,
      },
      useFilters, // useFilters!
      useGlobalFilter, // useGlobalFilter!
      useRowSelect,
      hooks => {
        hooks.visibleColumns.push(columns => [
          // Let's make a column for selection
          {
            id: 'selection',
            // The header can use the table's getToggleAllRowsSelectedProps method
            // to render a checkbox
            Header: ({ getToggleAllRowsSelectedProps }) => (
                <div>
                  <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
                </div>
            ),
            // The cell can use the individual row's getToggleRowSelectedProps method
            // to the render a checkbox
            Cell: ({ row }) => (
                <div>
                  <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
                </div>
            ),
          },
          ...columns,
        ])
      }
  )

  // We don't want to render all of the rows for this example, so cap
  // it for this use case
  const firstPageRows = rows.slice(0, 10)

  return (
      <>
          <pre>
        <code>
          {JSON.stringify(
              {
                selectedRowIds
              },
              null,
              2
          )}
        </code>
      </pre>
        <button onClick={() => {
          toggleAllRowsSelected(false);
        }}>Deselect All</button>
        <table {...getTableProps()}>
          <thead>
          {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                    <th {...column.getHeaderProps()}>
                      {column.render('Header')}
                      {/* Render the columns filter UI */}
                      <div>{column.canFilter ? column.render('Filter') : null}</div>
                    </th>
                ))}
              </tr>
          ))}
          <tr>
            <th
                colSpan={visibleColumns.length}
                style={{
                  textAlign: 'left',
                }}
            >
              <GlobalFilter
                  preGlobalFilteredRows={preGlobalFilteredRows}
                  globalFilter={state.globalFilter}
                  setGlobalFilter={setGlobalFilter}
              />
            </th>
          </tr>
          </thead>
          <tbody {...getTableBodyProps()}>
          {firstPageRows.map((row, i) => {
            prepareRow(row)
            return (
                <tr {...row.getRowProps()}>
                  {row.cells.map(cell => {
                    return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                  })}
                </tr>
            )
          })}
          </tbody>
        </table>
        <br />
        <div>Showing the first 20 results of {rows.length} rows</div>

      </>
  )
}

// Define a custom filter filter function!
function filterGreaterThan(rows, id, filterValue) {
  return rows.filter(row => {
    const rowValue = row.values[id]
    return rowValue >= filterValue
  })
}

// This is an autoRemove method on the filter function that
// when given the new filter value and returns true, the filter
// will be automatically removed. Normally this is just an undefined
// check, but here, we want to remove the filter if it's not a number
filterGreaterThan.autoRemove = val => typeof val !== 'number'

function App() {
  const columns = React.useMemo(
      () => [
        {
          Header: 'Name',
          columns: [
            {
              Header: 'First Name',
              accessor: 'firstName',
            },
            {
              Header: 'Last Name',
              accessor: 'lastName',
              // Use our custom `fuzzyText` filter on this column
              filter: 'fuzzyText',
            },
          ],
        }
      ],
      []
  )

  const data = React.useMemo(() => makeData(10), [])

  return (
      <Styles>
        <Table columns={columns} data={data} />
      </Styles>
  )
}

export default App