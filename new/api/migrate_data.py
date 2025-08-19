#!/usr/bin/env python3
"""
Data migration script for Seattle Band Map
Transfers data from old CSV files to new PostgreSQL database
"""

import csv
import os
import sys
from datetime import datetime

from sqlalchemy.orm import Session

from database import SessionLocal
from models import Band, Base, Connection


def parse_timestamp(timestamp_str: str) -> datetime:
    """Parse timestamp from various formats in the old data"""
    if not timestamp_str or timestamp_str == "2010":
        return datetime.now()

    try:
        # Try parsing as Unix timestamp
        if timestamp_str.isdigit():
            return datetime.fromtimestamp(int(timestamp_str))
        else:
            # Try parsing as date string
            return datetime.strptime(timestamp_str, "%Y-%m-%d")
    except (ValueError, OSError):
        return datetime.now()


def clean_string(s: str) -> str | None:
    """Clean and normalize string data"""
    if not s:
        return None
    return s.strip()


def migrate_bands(csv_path: str, session: Session) -> None:
    """Migrate bands from CSV to database"""
    print("Migrating bands...")

    seen_ids = set()
    seen_names = set()
    skipped_id_count = 0
    skipped_name_count = 0

    with open(csv_path, encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            try:
                # Parse the data
                band_id = int(row["Id"])
                name = clean_string(row["name"])
                
                # Skip if we've already seen this ID
                if band_id in seen_ids:
                    skipped_id_count += 1
                    continue
                
                # Skip if we've already seen this name
                if name in seen_names:
                    skipped_name_count += 1
                    continue
                
                seen_ids.add(band_id)
                seen_names.add(name)
                
                city = clean_string(row["city"])
                state = clean_string(row["state"])
                click_count = (
                    int(row["click_count"]) if row["click_count"].isdigit() else 0
                )
                last_updated = parse_timestamp(row["last_updated"])

                # Create band object
                band = Band(
                    id=band_id,
                    name=name,
                    description=f"Location: {city}, {state}"
                    if city and state
                    else None,
                    click_count=click_count,
                    last_updated=last_updated,
                    created_at=last_updated,  # Use last_updated as created_at for now
                )

                session.add(band)

            except (ValueError, KeyError) as e:
                print(f"Error processing band row: {row} - {e}")
                continue

    session.commit()
    if skipped_id_count > 0:
        print(f"Skipped {skipped_id_count} duplicate band IDs")
    if skipped_name_count > 0:
        print(f"Skipped {skipped_name_count} duplicate band names")
    print("Bands migration completed!")


def migrate_connections(csv_path: str, session: Session) -> None:
    """Migrate connections from CSV to database"""
    print("Migrating connections...")

    # Get all existing band IDs from the database
    existing_band_ids = {band.id for band in session.query(Band).all()}
    
    skipped_count = 0
    created_count = 0

    with open(csv_path, encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            try:
                # Parse the data
                band1_id = int(row["band_1"])
                band2_id = int(row[" band_2"])  # Note the space in the column name

                # Skip if either band doesn't exist in the database
                if band1_id not in existing_band_ids or band2_id not in existing_band_ids:
                    skipped_count += 1
                    continue

                # Create connection object
                connection = Connection(
                    band1_id=band1_id,
                    band2_id=band2_id,
                    connection_type="collaboration",  # Default type
                    description="Migrated from old database",
                )

                session.add(connection)
                created_count += 1

            except (ValueError, KeyError) as e:
                print(f"Error processing connection row: {row} - {e}")
                continue

    session.commit()
    print(f"Created {created_count} connections")
    if skipped_count > 0:
        print(f"Skipped {skipped_count} connections (referenced non-existent bands)")
    print("Connections migration completed!")


def main() -> None:
    """Main migration function"""
    print("Starting Seattle Band Map data migration...")

    # Create database tables
    Base.metadata.create_all(bind=SessionLocal().bind)

    # Create session
    session = SessionLocal()

    try:
        # Paths to CSV files
        bands_csv = os.path.join("/app", "old", "db", "band.csv")
        connections_csv = os.path.join("/app", "old", "db", "connnections.csv")

        # Check if files exist
        if not os.path.exists(bands_csv):
            print(f"Error: Bands CSV file not found at {bands_csv}")
            sys.exit(1)

        if not os.path.exists(connections_csv):
            print(f"Error: Connections CSV file not found at {connections_csv}")
            sys.exit(1)

        # Clear existing data
        print("Clearing existing data...")
        session.query(Connection).delete()
        session.query(Band).delete()
        session.commit()

        # Migrate data
        migrate_bands(bands_csv, session)
        migrate_connections(connections_csv, session)

        # Print summary
        band_count = session.query(Band).count()
        connection_count = session.query(Connection).count()

        print("\nMigration completed successfully!")
        print(f"Bands migrated: {band_count}")
        print(f"Connections migrated: {connection_count}")

    except Exception as e:
        print(f"Migration failed: {e}")
        session.rollback()
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    main()
