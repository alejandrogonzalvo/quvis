import numpy as np
import zipfile

try:
    with zipfile.ZipFile('qft_interactions.npz', 'r') as zf:
        for member_name in zf.namelist():
            info = zf.getinfo(member_name)
            print(f"Member: {member_name}")
            print(f"  Comment: {info.comment.decode('utf-8', errors='ignore')}") # Decode comment
            print(f"  Compressed Size: {info.compress_size}")
            print(f"  Uncompressed Size (File Size): {info.file_size}")
            print(f"  Compression Type: {info.compress_type}")
            # ZIP_STORED = 0, ZIP_DEFLATED = 8
            if info.compress_type == zipfile.ZIP_STORED:
                print("    Method: Stored (no compression)")
            elif info.compress_type == zipfile.ZIP_DEFLATED:
                print("    Method: Deflated")
            else:
                print(f"    Method: Unknown ({info.compress_type})")
            print(f"  Header Offset: {info.header_offset}")
            print(f"  CRC: {info.CRC}")
            print(f"  Extra field length: {len(info.extra)}")
            
            # Attempt to find specific Zip64 fields in extra data for more robust check
            # Zip64 extended information extra field has Header ID 0x0001.
            # Structure: 0x0001 (2 bytes) + Size (2 bytes) + Original Size (8 bytes) + Compressed Size (8 bytes) [+ Disk Start Number (8 bytes)]
            extra_offset = 0
            zip64_found = False
            while extra_offset < len(info.extra):
                header_id = int.from_bytes(info.extra[extra_offset:extra_offset+2], 'little')
                size_of_field = int.from_bytes(info.extra[extra_offset+2:extra_offset+4], 'little')
                if header_id == 0x0001:
                    print(f"    Found Zip64 extended information extra field (0x0001) of size {size_of_field}.")
                    zip64_found = True
                    # We could parse out the 64-bit sizes here if needed
                    break 
                extra_offset += (4 + size_of_field) # Move to next extra field header
            if not zip64_found:
                print("    No standard Zip64 extended information extra field (0x0001) found.")


    print("\n--- NumPy load ---")
    data = np.load('qft_interactions.npz', allow_pickle=True)
    print("Files in NPZ:", data.files)
    if 'operations_per_slice' in data:
        ops_data = data['operations_per_slice']
        print("Operations per slice (type):", type(ops_data))
        print("Operations per slice (dtype):", ops_data.dtype)
        print("Operations per slice (shape):", ops_data.shape)
        if ops_data.size > 0:
            print("First operation string example (type):", type(ops_data[0]))
            print("First operation string content:", ops_data[0])
        else:
            print("Operations per slice is empty.")

    else:
        print("'operations_per_slice' not found.")
    if 'num_qubits' in data:
        num_q_data = data['num_qubits']
        print("Num qubits (type):", type(num_q_data))
        print("Num qubits (dtype):", num_q_data.dtype)
        print("Num qubits (content):", num_q_data)
    else:
        print("'num_qubits' not found.")
except Exception as e:
    print("Error during NPZ check:", e) 